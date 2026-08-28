"""Rule-based event detection.

Deliberately NOT an LLM step — this is the mechanical half of "what changed":
comparing today's computed signals against their own recent history and
flagging crossings, using the exact same rolling technical score the
backtest engine replays. An LLM-based counterpart (extracting structured
events out of news text, per the wider research-engine design) is a
documented extension point, not built here — see README.

Each detected event is upserted into the `events` table keyed on
(symbol, date, event_type), so re-running detection on a day that's already
been scored is a no-op rather than a duplicate.
"""

import numpy as np
import pandas as pd

import db
from analysis import annualized_volatility
from backtest import rolling_technical_score

VOL_ZSCORE_THRESHOLD = 2.0
MOMENTUM_ZSCORE_THRESHOLD = 2.0
POSITIONING_ZSCORE_THRESHOLD = 2.0
POSITIONING_WEEKLY_SHIFT_THRESHOLD = 5.0  # percentage points of open interest, week over week


def _zseries(series: pd.Series, window: int = 504) -> pd.Series:
    roll_mean = series.rolling(window, min_periods=60).mean()
    roll_std = series.rolling(window, min_periods=60).std()
    return (series - roll_mean) / roll_std.replace(0, np.nan)


def detect_price_events(symbol: str, df: pd.DataFrame) -> list[dict]:
    if df.empty or len(df) < 210:
        return []
    close = df["Close"]
    date = df.index[-1].strftime("%Y-%m-%d")
    events = []

    sma200 = close.rolling(200).mean()
    dist_today = close.iloc[-1] - sma200.iloc[-1]
    dist_yday = close.iloc[-2] - sma200.iloc[-2]
    if pd.notna(dist_today) and pd.notna(dist_yday) and np.sign(dist_today) != np.sign(dist_yday) and dist_today != 0:
        direction = "bullish" if dist_today > 0 else "bearish"
        events.append({
            "event_type": "trend_cross_200dma",
            "description": f"Price crossed {'above' if direction == 'bullish' else 'below'} its 200-day average",
            "direction": direction,
            "magnitude": round(float(abs(dist_today) / sma200.iloc[-1] * 100), 2),
            "date": date,
        })

    vol = annualized_volatility(close)
    vol_z = _zseries(vol)
    if pd.notna(vol_z.iloc[-1]) and abs(vol_z.iloc[-1]) >= VOL_ZSCORE_THRESHOLD and (
        len(vol_z) < 2 or pd.isna(vol_z.iloc[-2]) or abs(vol_z.iloc[-2]) < VOL_ZSCORE_THRESHOLD
    ):
        events.append({
            "event_type": "volatility_spike",
            "description": f"21-day volatility jumped to {vol.iloc[-1]:.1f}% annualized, a {vol_z.iloc[-1]:+.1f}σ move vs its own 2-year range",
            "direction": "risk",
            "magnitude": round(float(vol_z.iloc[-1]), 2),
            "date": date,
        })

    mom = close.pct_change(63)
    mom_z = _zseries(mom)
    if pd.notna(mom_z.iloc[-1]) and abs(mom_z.iloc[-1]) >= MOMENTUM_ZSCORE_THRESHOLD and (
        len(mom_z) < 2 or pd.isna(mom_z.iloc[-2]) or abs(mom_z.iloc[-2]) < MOMENTUM_ZSCORE_THRESHOLD
    ):
        direction = "bullish" if mom_z.iloc[-1] > 0 else "bearish"
        events.append({
            "event_type": "momentum_extreme",
            "description": f"3-month momentum reached a {abs(mom_z.iloc[-1]):.1f}σ extreme vs its own 2-year range",
            "direction": direction,
            "magnitude": round(float(mom_z.iloc[-1]), 2),
            "date": date,
        })

    score = rolling_technical_score(df)
    if len(score) >= 2 and pd.notna(score.iloc[-1]) and pd.notna(score.iloc[-2]):
        crossed_bullish = score.iloc[-1] >= 2 and score.iloc[-2] < 2
        crossed_bearish = score.iloc[-1] <= -2 and score.iloc[-2] > -2
        if crossed_bullish or crossed_bearish:
            direction = "bullish" if crossed_bullish else "bearish"
            events.append({
                "event_type": "signal_flip",
                "description": f"Technical signal turned {direction} (score {int(score.iloc[-1])})",
                "direction": direction,
                "magnitude": float(score.iloc[-1]),
                "date": date,
            })

    return events


def detect_positioning_events(symbol: str, positioning_df: pd.DataFrame) -> list[dict]:
    if positioning_df.empty or len(positioning_df) < 27:
        return []
    net = positioning_df["managed_money_long"] - positioning_df["managed_money_short"]
    net_pct_oi = (net / positioning_df["open_interest"].replace(0, np.nan)) * 100
    z = _zseries(net_pct_oi, window=156)
    date = positioning_df.index[-1].strftime("%Y-%m-%d")
    events = []

    if pd.notna(z.iloc[-1]) and abs(z.iloc[-1]) >= POSITIONING_ZSCORE_THRESHOLD:
        direction = "crowded_long" if z.iloc[-1] > 0 else "crowded_short"
        events.append({
            "event_type": "positioning_extreme",
            "description": f"Managed Money net position is at a {abs(z.iloc[-1]):.1f}σ extreme ({direction.replace('_', ' ')}) vs its own 3-year range",
            "direction": "bearish" if direction == "crowded_long" else "bullish",  # crowded positioning is a contrarian flag
            "magnitude": round(float(z.iloc[-1]), 2),
            "date": date,
        })

    if len(net_pct_oi) >= 2 and pd.notna(net_pct_oi.iloc[-1]) and pd.notna(net_pct_oi.iloc[-2]):
        shift = net_pct_oi.iloc[-1] - net_pct_oi.iloc[-2]
        if abs(shift) >= POSITIONING_WEEKLY_SHIFT_THRESHOLD:
            direction = "bullish" if shift > 0 else "bearish"
            events.append({
                "event_type": "positioning_shift",
                "description": f"Managed Money net position moved {shift:+.1f} points of open interest in one week",
                "direction": direction,
                "magnitude": round(float(shift), 2),
                "date": date,
            })

    return events


def record_events(symbol: str, events: list[dict]) -> None:
    if not events:
        return
    conn = db.connect()
    try:
        conn.executemany(
            """
            INSERT OR IGNORE INTO events (symbol, date, event_type, description, direction, magnitude, detail)
            VALUES (?, ?, ?, ?, ?, ?, NULL)
            """,
            [(symbol, e["date"], e["event_type"], e["description"], e["direction"], e["magnitude"]) for e in events],
        )
        conn.commit()
    finally:
        conn.close()


def recent_events(days: int = 14, limit: int = 100) -> list[dict]:
    conn = db.connect()
    try:
        rows = conn.execute(
            """
            SELECT symbol, date, event_type, description, direction, magnitude
            FROM events
            WHERE date >= date('now', ?)
            ORDER BY date DESC, ABS(magnitude) DESC
            LIMIT ?
            """,
            (f"-{days} days", limit),
        ).fetchall()
        return [
            {
                "symbol": r[0], "date": r[1], "eventType": r[2],
                "description": r[3], "direction": r[4], "magnitude": r[5],
            }
            for r in rows
        ]
    finally:
        conn.close()

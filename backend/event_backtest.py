"""Historical backtest of each event TYPE that events.py detects.

Separate from backtest.py's overall-signal backtest: this answers a
narrower question per event — "historically, on this instrument, what
happened over the following N trading days every time a 200-day-average
cross / volatility spike / momentum extreme / signal flip / positioning
extreme or shift like this one occurred before?" Replays the exact same
threshold logic events.py uses for live detection, just across the whole
history instead of only the latest day, so the numbers are directly
comparable to what triggered the event you're looking at.
"""

import numpy as np
import pandas as pd

from analysis import annualized_volatility
from backtest import rolling_technical_score
from events import (
    MOMENTUM_ZSCORE_THRESHOLD,
    POSITIONING_WEEKLY_SHIFT_THRESHOLD,
    POSITIONING_ZSCORE_THRESHOLD,
    VOL_ZSCORE_THRESHOLD,
    _zseries,
)


def _fresh_crossings(condition: pd.Series) -> pd.Series:
    """True only on the day a boolean condition first becomes true after
    being false — a fresh crossing, not every day it happens to hold."""
    return condition.fillna(False) & ~condition.shift(1).fillna(False)


def _forward_returns(close: pd.Series, forward_days: int) -> pd.Series:
    return close.shift(-forward_days) / close - 1


def _summarize(forward: pd.Series, occurred: pd.Series) -> dict | None:
    sample = forward[occurred & forward.notna()]
    if len(sample) == 0:
        return None
    return {
        "sampleSize": int(len(sample)),
        "avgReturn": round(float(sample.mean()) * 100, 2),
        "medianReturn": round(float(sample.median()) * 100, 2),
        "winRate": round(float((sample > 0).mean()) * 100, 1),
    }


def backtest_event_type(event_type: str, df: pd.DataFrame, positioning_df: pd.DataFrame | None, forward_days: int = 21) -> dict | None:
    if df.empty or len(df) < 210:
        return None
    close = df["Close"]
    forward = _forward_returns(close, forward_days)
    variants: list[tuple[str, pd.Series]] = []

    if event_type == "trend_cross_200dma":
        dist = close - close.rolling(200).mean()
        variants = [("bullish", _fresh_crossings(dist > 0)), ("bearish", _fresh_crossings(dist < 0))]

    elif event_type == "volatility_spike":
        vol_z = _zseries(annualized_volatility(close))
        variants = [("risk", _fresh_crossings(vol_z.abs() >= VOL_ZSCORE_THRESHOLD))]

    elif event_type == "momentum_extreme":
        mom_z = _zseries(close.pct_change(63))
        variants = [
            ("bullish", _fresh_crossings(mom_z >= MOMENTUM_ZSCORE_THRESHOLD)),
            ("bearish", _fresh_crossings(mom_z <= -MOMENTUM_ZSCORE_THRESHOLD)),
        ]

    elif event_type == "signal_flip":
        score = rolling_technical_score(df)
        variants = [("bullish", _fresh_crossings(score >= 2)), ("bearish", _fresh_crossings(score <= -2))]

    elif event_type in ("positioning_extreme", "positioning_shift"):
        if positioning_df is None or positioning_df.empty or len(positioning_df) < 27:
            return None
        net = positioning_df["managed_money_long"] - positioning_df["managed_money_short"]
        net_pct_oi = (net / positioning_df["open_interest"].replace(0, np.nan)) * 100

        if event_type == "positioning_extreme":
            z = _zseries(net_pct_oi, window=156).reindex(close.index, method="ffill")
            # Crowded positioning is treated as a contrarian flag, same as in live detection.
            variants = [
                ("bullish", _fresh_crossings(z <= -POSITIONING_ZSCORE_THRESHOLD)),  # crowded short
                ("bearish", _fresh_crossings(z >= POSITIONING_ZSCORE_THRESHOLD)),  # crowded long
            ]
        else:
            shift = net_pct_oi.diff().reindex(close.index, method="ffill")
            variants = [
                ("bullish", _fresh_crossings(shift >= POSITIONING_WEEKLY_SHIFT_THRESHOLD)),
                ("bearish", _fresh_crossings(shift <= -POSITIONING_WEEKLY_SHIFT_THRESHOLD)),
            ]
    else:
        return None

    results = []
    for direction, occurred in variants:
        summary = _summarize(forward, occurred)
        if summary:
            results.append({"direction": direction, **summary})

    if not results:
        return None
    return {"eventType": event_type, "forwardDays": forward_days, "results": results}

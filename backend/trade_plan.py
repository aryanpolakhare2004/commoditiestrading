"""A concrete, mechanical trade plan for one commodity.

Pulls together pieces that otherwise live in separate tabs: the technical
signal's direction, a volatility-scaled stop (a multiple of the 14-day
Average True Range, so the stop sits outside normal day-to-day noise), a
target at the historical average winning move for this setup, position size
for a given account/risk budget, and any scheduled report inside the next
week that could gap price through the stop.

This is arithmetic on history, not a recommendation — the plan is only as
good as the backtest it reads from, and says so via sample size and
`setupActive`.
"""

import pandas as pd

import calendar_events
import contracts
from backtest import backtest_signal
from opportunity import trade_side_stats


def average_true_range(df: pd.DataFrame, window: int = 14) -> float | None:
    if len(df) < window + 1:
        return None
    high, low, close = df["High"], df["Low"], df["Close"]
    prev_close = close.shift(1)
    true_range = pd.concat([high - low, (high - prev_close).abs(), (low - prev_close).abs()], axis=1).max(axis=1)
    atr = true_range.rolling(window).mean().iloc[-1]
    return None if pd.isna(atr) else float(atr)


def build_trade_plan(meta: dict, df: pd.DataFrame, account_size: float, risk_pct: float, atr_mult: float = 2.0) -> dict:
    symbol = meta["symbol"]
    bt = backtest_signal(df)
    score = bt["currentScore"]
    is_bullish = (score or 0) >= 0
    setup = bt["bullishSetup"] if is_bullish else bt["bearishSetup"]
    trade = trade_side_stats(setup, is_bullish)

    entry = float(df["Close"].dropna().iloc[-1])
    atr = average_true_range(df)
    catalysts = calendar_events.catalysts_for(symbol, days_ahead=7)

    plan = {
        "symbol": symbol,
        "meta": meta,
        "asOf": df.index[-1].strftime("%Y-%m-%d"),
        "side": "long" if is_bullish else "short",
        "currentScore": score,
        # The backtest only counts a setup at or beyond these thresholds; a
        # score in between leans one way but isn't a historically-tested signal.
        "setupActive": score is not None and (score >= bt["buyThreshold"] or score <= bt["sellThreshold"]),
        "forwardDays": bt["forwardDays"],
        "history": trade and {**trade, "sampleSize": setup["sampleSize"],
                              "expectedValue": round(trade["winRate"] / 100 * trade["upside"]
                                                     - (1 - trade["winRate"] / 100) * trade["downside"], 2)},
        "entry": round(entry, 4),
        "atr": None if atr is None else round(atr, 4),
        "atrMultiple": atr_mult,
        "stop": None,
        "target": None,
        "rewardToRisk": None,
        "sizing": None,
        "catalysts": catalysts,
    }
    if atr is None or atr == 0:
        return plan

    direction = 1 if is_bullish else -1
    stop = entry - direction * atr_mult * atr
    plan["stop"] = round(stop, 4)

    if trade and trade["upside"] > 0:
        target = entry * (1 + direction * trade["upside"] / 100)
        plan["target"] = round(target, 4)
        plan["rewardToRisk"] = round(abs(target - entry) / abs(entry - stop), 2)

    if symbol in contracts.SPECS:
        plan["sizing"] = contracts.position_size(symbol, account_size, risk_pct, entry, stop)

    return plan

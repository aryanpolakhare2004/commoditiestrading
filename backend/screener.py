"""Composite 'what to consider buying' screener.

This is a transparent, rule-based ranking built from three independent signals
(technical trend, price momentum, news sentiment) added together — not a
prediction, not backtested, and not investment advice. Every component is
visible in the response so the reasoning can be checked.
"""

import pandas as pd

from analysis import build_signal, pct_change_over


def _bucket(value: float | None, threshold: float) -> int:
    if value is None:
        return 0
    if value >= threshold:
        return 1
    if value <= -threshold:
        return -1
    return 0


def momentum_component(change1m: float | None, change3m: float | None) -> int:
    return _bucket(change1m, 5) + _bucket(change3m, 10)


def sentiment_component(compound: float | None) -> int:
    if compound is None:
        return 0
    if compound >= 0.15:
        return 1
    if compound <= -0.15:
        return -1
    return 0


def verdict_for(composite: int) -> str:
    if composite >= 3:
        return "Strong Buy signal"
    if composite >= 1:
        return "Buy signal"
    if composite <= -3:
        return "Strong Sell signal"
    if composite <= -1:
        return "Sell signal"
    return "Neutral"


def build_screener_entry(meta: dict, df: pd.DataFrame, sentiment_summary: dict) -> dict:
    close = df["Close"]
    signal = build_signal(df)
    change1d = pct_change_over(close, 1)
    change1m = pct_change_over(close, 21)
    change3m = pct_change_over(close, 63)

    mom = momentum_component(change1m, change3m)
    sent = sentiment_component(sentiment_summary["compound"] if sentiment_summary else None)
    composite = signal["score"] + mom + sent

    reasons = list(signal["reasons"])
    if change1m is not None:
        reasons.append(f"1M momentum {change1m:+.1f}%")
    if change3m is not None:
        reasons.append(f"3M momentum {change3m:+.1f}%")
    if sentiment_summary and sentiment_summary["count"] > 0:
        reasons.append(f"News sentiment: {sentiment_summary['label']} ({sentiment_summary['count']} headlines)")
    else:
        reasons.append("No recent news to score")

    return {
        "symbol": meta["symbol"],
        "name": meta["name"],
        "sector": meta["sector"],
        "unit": meta["unit"],
        "last": round(float(close.iloc[-1]), 4),
        "change1d": None if change1d is None else round(change1d, 2),
        "change1m": None if change1m is None else round(change1m, 2),
        "change3m": None if change3m is None else round(change3m, 2),
        "technicalScore": signal["score"],
        "momentumScore": mom,
        "sentimentScore": sent,
        "compositeScore": composite,
        "verdict": verdict_for(composite),
        "signalLabel": signal["label"],
        "sentiment": sentiment_summary,
        "reasons": reasons,
    }

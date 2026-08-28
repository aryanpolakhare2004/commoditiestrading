"""Composite factor signal: independent, individually z-scored components
combined into one number, in the spirit of a quant multi-factor model.

Every weight here is a documented starting guess, not fit to historical
data — there's no optimizer behind these numbers. Treat the composite as a
prioritization aid, not a validated model; the honest evidence about whether
signals like this actually work on a given commodity is the backtest
(backend/backtest.py), not this score.
"""

import numpy as np
import pandas as pd

from analysis import annualized_volatility

# Heuristic starting weights — see module docstring.
WEIGHTS = {
    "momentum": 0.30,
    "trend": 0.20,
    "positioning": 0.15,
    "volatility": -0.15,  # elevated volatility is a headwind, not a tailwind, all else equal
    "sentiment": 0.20,
}


def _zscore_of_latest(series: pd.Series, window: int = 504) -> float | None:
    s = series.dropna().tail(window)
    if len(s) < 60:
        return None
    mean, std = s.mean(), s.std()
    if std == 0 or pd.isna(std):
        return None
    return float((s.iloc[-1] - mean) / std)


def _clip(z: float | None, bound: float = 3.0) -> float | None:
    if z is None:
        return None
    return max(-bound, min(bound, z))


def compute_signals(df: pd.DataFrame, positioning: dict | None, sentiment: dict | None) -> dict:
    close = df["Close"]

    momentum_z = _clip(_zscore_of_latest(close.pct_change(63)))

    sma200 = close.rolling(200).mean()
    trend_dist = (close - sma200) / sma200
    trend_z = _clip(_zscore_of_latest(trend_dist))

    vol = annualized_volatility(close)
    volatility_z = _clip(_zscore_of_latest(vol))

    positioning_z = _clip(positioning["zScore"]) if positioning else None

    sentiment_score = sentiment["compound"] if sentiment and sentiment.get("count") else None

    components = {
        "momentum": momentum_z,
        "trend": trend_z,
        "positioning": positioning_z,
        "volatility": volatility_z,
        "sentiment": sentiment_score,
    }

    weighted_sum = 0.0
    weight_used = 0.0
    for key, value in components.items():
        if value is None:
            continue
        weighted_sum += WEIGHTS[key] * value
        weight_used += abs(WEIGHTS[key])

    composite = round(weighted_sum / weight_used, 3) if weight_used > 0 else None

    return {
        "components": {k: (None if v is None else round(v, 2)) for k, v in components.items()},
        "weights": WEIGHTS,
        "composite": composite,
        "coverage": round(weight_used / sum(abs(w) for w in WEIGHTS.values()), 2) if weight_used else 0.0,
    }

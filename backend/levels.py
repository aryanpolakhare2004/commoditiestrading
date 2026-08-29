"""Classical pivot points and recent swing highs/lows.

Pure arithmetic on the prior completed period's high/low/close — the same
formula traders have used for decades, not fitted to anything. Swing levels
are local extrema over a lookback window: a simple, honest definition (the
highest/lowest close in a centered window), not a pattern-recognition claim.
"""

import pandas as pd


def _pivot_from_hlc(high: float, low: float, close: float) -> dict:
    pp = (high + low + close) / 3
    r1 = 2 * pp - low
    s1 = 2 * pp - high
    r2 = pp + (high - low)
    s2 = pp - (high - low)
    r3 = high + 2 * (pp - low)
    s3 = low - 2 * (high - pp)
    return {
        "pp": round(pp, 4), "r1": round(r1, 4), "r2": round(r2, 4), "r3": round(r3, 4),
        "s1": round(s1, 4), "s2": round(s2, 4), "s3": round(s3, 4),
    }


def pivot_points(df: pd.DataFrame) -> dict:
    """Daily pivots from yesterday's H/L/C, and weekly pivots from last week's."""
    result = {"daily": None, "weekly": None}
    if len(df) < 2:
        return result

    # Skip degenerate zero-range rows (a data quirk on some thin sessions,
    # not a real trading range) when picking "yesterday".
    candidates = df.iloc[:-1]
    tradable = candidates[candidates["High"] > candidates["Low"]]
    prior_day = tradable.iloc[-1] if not tradable.empty else candidates.iloc[-1]
    prior_day_date = prior_day.name
    result["daily"] = {
        **_pivot_from_hlc(float(prior_day["High"]), float(prior_day["Low"]), float(prior_day["Close"])),
        "basedOn": prior_day_date.strftime("%Y-%m-%d"),
    }

    weekly = df.resample("W-FRI").agg({"High": "max", "Low": "min", "Close": "last"}).dropna()
    if len(weekly) >= 2:
        prior_week = weekly.iloc[-2]
        result["weekly"] = {
            **_pivot_from_hlc(float(prior_week["High"]), float(prior_week["Low"]), float(prior_week["Close"])),
            "basedOn": weekly.index[-2].strftime("%Y-%m-%d"),
        }

    return result


def swing_levels(df: pd.DataFrame, lookback: int = 120, order: int = 5, max_levels: int = 5) -> dict:
    """Local highs/lows over the trailing `lookback` days — a point is a swing
    high/low if it's the max/min within `order` days on each side of it."""
    window = df.tail(lookback)
    if len(window) < order * 2 + 1:
        return {"highs": [], "lows": []}

    highs, lows = [], []
    high_vals, low_vals = window["High"].values, window["Low"].values
    dates = window.index

    for i in range(order, len(window) - order):
        segment_high = high_vals[i - order: i + order + 1]
        if high_vals[i] == segment_high.max():
            highs.append({"date": dates[i].strftime("%Y-%m-%d"), "price": round(float(high_vals[i]), 4)})
        segment_low = low_vals[i - order: i + order + 1]
        if low_vals[i] == segment_low.min():
            lows.append({"date": dates[i].strftime("%Y-%m-%d"), "price": round(float(low_vals[i]), 4)})

    highs.sort(key=lambda h: h["price"], reverse=True)
    lows.sort(key=lambda l: l["price"])
    return {"highs": highs[:max_levels], "lows": lows[:max_levels]}

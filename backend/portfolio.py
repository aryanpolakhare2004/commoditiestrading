"""Portfolio allocation and Monte Carlo simulation.

Two deliberately separate, honest steps:

1. Allocation weights come from a documented, deterministic rule (equal
   weight, inverse volatility / risk parity, or an opportunity-score tilt
   capped so no single heuristic score can dominate) -- never a return
   forecast, because commodity expected returns are not reliably
   estimable from history the way volatility is.
2. The simulation is a block bootstrap over REAL historical daily returns:
   it resamples the same calendar day's return across every selected
   commodity together, so the correlation structure between them (energy
   names moving together, precious metals moving together, etc.) is
   preserved rather than assumed away by a parametric/Gaussian model. It
   answers "if the future drew from the same distribution of daily moves
   this history did, what range of outcomes results" -- not a prediction
   of what will actually happen.
"""

import numpy as np
import pandas as pd


def equal_weights(symbols: list[str]) -> dict:
    n = len(symbols)
    return {s: 1 / n for s in symbols}


def inverse_volatility_weights(vol_by_symbol: dict) -> dict:
    inv = {s: 1 / v for s, v in vol_by_symbol.items() if v and v > 0}
    total = sum(inv.values())
    if total == 0:
        return equal_weights(list(vol_by_symbol.keys()))
    return {s: w / total for s, w in inv.items()}


def opportunity_tilted_weights(vol_by_symbol: dict, score_by_symbol: dict, tilt: float = 0.3) -> dict:
    """Inverse-volatility weights, nudged (by at most `tilt` of the
    portfolio) toward names with a higher current technical score. Capped
    deliberately so a heuristic score can influence but never dominate."""
    base = inverse_volatility_weights(vol_by_symbol)
    scores = {s: score_by_symbol.get(s, 0) for s in base}
    min_score = min(scores.values())
    shifted = {s: v - min_score + 0.1 for s, v in scores.items()}  # keep all weights positive
    total_shifted = sum(shifted.values())
    score_weights = {s: v / total_shifted for s, v in shifted.items()}
    return {s: (1 - tilt) * base[s] + tilt * score_weights[s] for s in base}


def simulate_portfolio(returns: pd.DataFrame, weights: dict, horizon_days: int, num_paths: int, seed: int | None = None) -> dict:
    """returns: daily pct-return DataFrame, columns = symbols, aligned dates.
    weights: {symbol: weight}, should sum to ~1."""
    symbols = list(weights.keys())
    w = np.array([weights[s] for s in symbols])
    r = returns[symbols].dropna()
    n_days = len(r)
    if n_days < 30:
        raise ValueError("Not enough overlapping historical data across the selected commodities to simulate.")

    rng = np.random.default_rng(seed)
    idx = rng.integers(0, n_days, size=(num_paths, horizon_days))
    daily_returns = r.values[idx]  # (num_paths, horizon_days, n_symbols)
    portfolio_daily = daily_returns @ w  # (num_paths, horizon_days)
    cumulative = np.cumprod(1 + portfolio_daily, axis=1)  # multiplier of starting value

    final = cumulative[:, -1]
    running_max = np.maximum.accumulate(cumulative, axis=1)
    drawdown = (cumulative / running_max) - 1
    max_drawdown = drawdown.min(axis=1)

    step = max(1, horizon_days // 120)  # thin the path series for a lighter chart payload
    path_days = list(range(0, horizon_days, step)) + [horizon_days - 1]
    path_percentiles = {
        f"p{p}": [round(float(np.percentile(cumulative[:, d], p)), 4) for d in path_days]
        for p in (5, 25, 50, 75, 95)
    }

    return {
        "horizonDays": horizon_days,
        "numPaths": num_paths,
        "historicalDaysUsed": int(n_days),
        "days": path_days,
        "finalMultiplier": {
            "mean": round(float(final.mean()), 4),
            "median": round(float(np.median(final)), 4),
            "p5": round(float(np.percentile(final, 5)), 4),
            "p25": round(float(np.percentile(final, 25)), 4),
            "p75": round(float(np.percentile(final, 75)), 4),
            "p95": round(float(np.percentile(final, 95)), 4),
        },
        "probabilityOfLoss": round(float((final < 1).mean()), 4),
        "maxDrawdown": {
            "median": round(float(np.median(max_drawdown)), 4),
            "p5Worst": round(float(np.percentile(max_drawdown, 5)), 4),
        },
        "pathPercentiles": path_percentiles,
    }

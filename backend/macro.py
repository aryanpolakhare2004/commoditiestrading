"""Macro drivers and each commodity's sensitivity to them.

Commodities are priced in dollars and trade alongside risk appetite, so a
handful of cross-asset series explain a lot of their common movement:
- US Dollar Index: a stronger dollar makes dollar-priced commodities dearer
  abroad — metals and grains in particular tend to move against it.
- 10-year Treasury yield: the opportunity cost of holding non-yielding
  assets (gold especially), and a read on growth/inflation expectations.
- S&P 500: risk appetite and the growth cycle — industrial metals and
  energy tend to move with it.
- VIX: equity-market stress; spikes usually coincide with broad selling.

Sensitivities are trailing 6-month statistics of daily moves — they drift
over time and describe co-movement, not cause.
"""

import numpy as np
import pandas as pd

from analysis import pct_change_over

MACRO_SERIES = [
    {"symbol": "DX-Y.NYB", "key": "dollar", "name": "US Dollar Index", "unit": "index"},
    {"symbol": "^TNX", "key": "yield10y", "name": "US 10Y Yield", "unit": "%"},
    {"symbol": "^GSPC", "key": "spx", "name": "S&P 500", "unit": "index"},
    {"symbol": "^VIX", "key": "vix", "name": "VIX", "unit": "index"},
]

# Yields are compared by their change in percentage points, not % change —
# a move from 4.00% to 4.10% is +10bp, which is what matters.
_LEVEL_CHANGE_KEYS = {"yield10y"}


def _driver_moves(close: pd.Series, key: str) -> pd.Series:
    return close.diff() if key in _LEVEL_CHANGE_KEYS else close.pct_change(fill_method=None)


def macro_snapshot(histories: dict[str, pd.DataFrame]) -> list[dict]:
    out = []
    for m in MACRO_SERIES:
        df = histories.get(m["symbol"])
        if df is None or df.empty:
            out.append({**m, "available": False})
            continue
        close = df["Close"].dropna()
        last_year = close.tail(252)
        change1d = pct_change_over(close, 1)
        change1m = pct_change_over(close, 21)
        entry = {
            **m,
            "available": True,
            "asOf": close.index[-1].strftime("%Y-%m-%d"),
            "last": round(float(close.iloc[-1]), 3),
            "change1d": None if change1d is None else round(change1d, 2),
            "change1m": None if change1m is None else round(change1m, 2),
            # Where today sits within the past year's range, 0 = low, 100 = high.
            "percentile1y": round(float((last_year <= close.iloc[-1]).mean()) * 100, 0),
            "sparkline": [round(float(v), 3) for v in close.tail(63).tolist()],
        }
        if m["key"] in _LEVEL_CHANGE_KEYS and len(close) > 21:
            entry["change1mBp"] = round(float(close.iloc[-1] - close.iloc[-22]) * 100, 0)
        out.append(entry)
    return out


def sensitivities(commodity_histories: dict[str, pd.DataFrame], macro_histories: dict[str, pd.DataFrame],
                  window_days: int = 126) -> dict[str, dict]:
    """Per commodity: correlation of its daily returns with each driver's
    daily moves over the trailing window, plus its beta to the dollar and
    what the dollar's own past-month move implies for it through that beta."""
    drivers = {}
    dollar_change_1m = None
    for m in MACRO_SERIES:
        df = macro_histories.get(m["symbol"])
        if df is None or df.empty:
            continue
        close = df["Close"].dropna()
        close.index = close.index.normalize()
        drivers[m["key"]] = _driver_moves(close, m["key"])
        if m["key"] == "dollar":
            dollar_change_1m = pct_change_over(close, 21)

    out = {}
    for symbol, df in commodity_histories.items():
        if df is None or df.empty:
            continue
        close = df["Close"].dropna()
        close.index = close.index.normalize()
        returns = close.pct_change(fill_method=None).tail(window_days)
        row = {}
        for key, moves in drivers.items():
            joined = pd.concat([returns, moves], axis=1, join="inner").dropna()
            if len(joined) < 40:
                row[key] = None
                continue
            corr = joined.iloc[:, 0].corr(joined.iloc[:, 1])
            row[key] = None if np.isnan(corr) else round(float(corr), 2)
            if key == "dollar":
                var = joined.iloc[:, 1].var()
                beta = float(joined.iloc[:, 0].cov(joined.iloc[:, 1]) / var) if var else None
                row["dollarBeta"] = None if beta is None else round(beta, 2)
                row["dollarImpact1m"] = (
                    None if beta is None or dollar_change_1m is None else round(beta * dollar_change_1m, 2)
                )
        out[symbol] = row
    return out

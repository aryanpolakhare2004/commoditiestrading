"""Historical backtest of the technical signal.

This is deliberately NOT a prediction model — it doesn't forecast future
prices. It answers a narrower, honestly-computable question: "historically,
on THIS instrument, what happened over the following N trading days each
time the technical signal looked like it does today (or looked bearish)?"
That's a statistic about the past, reported alongside a same-instrument
baseline (all days) so the reader can judge whether the setup shows any edge
over just holding — it is not a guarantee about the future.
"""

import numpy as np
import pandas as pd


def rolling_technical_score(df: pd.DataFrame) -> pd.Series:
    """Day-by-day version of analysis.build_signal's scoring rule, vectorized
    over the whole history instead of evaluated only at the last row."""
    close = df["Close"]
    sma20 = close.rolling(20).mean()
    sma50 = close.rolling(50).mean()
    sma200 = close.rolling(200).mean()

    delta = close.diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)
    avg_gain = gain.ewm(alpha=1 / 14, min_periods=14, adjust=False).mean()
    avg_loss = loss.ewm(alpha=1 / 14, min_periods=14, adjust=False).mean()
    rs = avg_gain / avg_loss.replace(0, np.nan)
    rsi = (100 - 100 / (1 + rs)).fillna(50)

    ema12 = close.ewm(span=12, adjust=False).mean()
    ema26 = close.ewm(span=26, adjust=False).mean()
    macd_line = ema12 - ema26
    signal_line = macd_line.ewm(span=9, adjust=False).mean()
    macd_hist = macd_line - signal_line

    score = pd.Series(0.0, index=close.index)
    covered = pd.Series(0, index=close.index)

    def add(available: pd.Series, positive: pd.Series, negative: pd.Series):
        nonlocal score, covered
        contribution = np.where(available & positive, 1, np.where(available & negative, -1, 0))
        score = score + contribution
        covered = covered + available.astype(int)

    avail_trend = sma20.notna() & sma50.notna()
    add(avail_trend, sma20 > sma50, sma20 <= sma50)

    avail_long_trend = sma200.notna()
    add(avail_long_trend, close > sma200, close <= sma200)

    avail_rsi = rsi.notna()
    add(avail_rsi, rsi <= 30, rsi >= 70)

    avail_macd = macd_hist.notna()
    add(avail_macd, macd_hist > 0, macd_hist <= 0)

    return score.where(covered > 0)


def _summarize(returns: pd.Series) -> dict | None:
    if len(returns) == 0:
        return None
    wins = returns[returns > 0]
    losses = returns[returns <= 0]
    return {
        "sampleSize": int(len(returns)),
        "avgReturn": round(float(returns.mean()) * 100, 2),
        "medianReturn": round(float(returns.median()) * 100, 2),
        "winRate": round(float((returns > 0).mean()) * 100, 1),
        # Average magnitude of the winning trades and the losing trades separately —
        # what an expected-value calculation needs, rather than just the blended average.
        "avgWin": round(float(wins.mean()) * 100, 2) if len(wins) else 0.0,
        "avgLoss": round(float(losses.mean()) * 100, 2) if len(losses) else 0.0,
    }


def backtest_signal(df: pd.DataFrame, forward_days: int = 21, buy_threshold: int = 2, sell_threshold: int = -2) -> dict:
    close = df["Close"]
    score = rolling_technical_score(df)
    forward_return = close.shift(-forward_days) / close - 1

    valid = score.notna() & forward_return.notna()
    baseline = forward_return[valid]
    bullish = forward_return[valid & (score >= buy_threshold)]
    bearish = forward_return[valid & (score <= sell_threshold)]

    baseline_summary = _summarize(baseline)
    bullish_summary = _summarize(bullish)
    bearish_summary = _summarize(bearish)

    edge = None
    if bullish_summary and baseline_summary:
        edge = round(bullish_summary["avgReturn"] - baseline_summary["avgReturn"], 2)

    return {
        "forwardDays": forward_days,
        "buyThreshold": buy_threshold,
        "sellThreshold": sell_threshold,
        "currentScore": None if score.empty or pd.isna(score.iloc[-1]) else int(score.iloc[-1]),
        "baseline": baseline_summary,
        "bullishSetup": bullish_summary,
        "bearishSetup": bearish_summary,
        "bullishEdgeVsBaseline": edge,
    }

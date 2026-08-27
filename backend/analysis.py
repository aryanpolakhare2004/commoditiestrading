"""Technical analysis helpers built on top of a pandas OHLCV DataFrame."""

import numpy as np
import pandas as pd


def sma(series: pd.Series, window: int) -> pd.Series:
    return series.rolling(window=window, min_periods=window).mean()


def ema(series: pd.Series, span: int) -> pd.Series:
    return series.ewm(span=span, adjust=False).mean()


def rsi(series: pd.Series, window: int = 14) -> pd.Series:
    delta = series.diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)
    avg_gain = gain.ewm(alpha=1 / window, min_periods=window, adjust=False).mean()
    avg_loss = loss.ewm(alpha=1 / window, min_periods=window, adjust=False).mean()
    rs = avg_gain / avg_loss.replace(0, np.nan)
    out = 100 - (100 / (1 + rs))
    return out.fillna(50)


def macd(series: pd.Series, fast: int = 12, slow: int = 26, signal: int = 9):
    macd_line = ema(series, fast) - ema(series, slow)
    signal_line = ema(macd_line, signal)
    hist = macd_line - signal_line
    return macd_line, signal_line, hist


def bollinger_bands(series: pd.Series, window: int = 20, num_std: float = 2.0):
    mid = sma(series, window)
    std = series.rolling(window=window, min_periods=window).std()
    upper = mid + num_std * std
    lower = mid - num_std * std
    return upper, mid, lower


def annualized_volatility(series: pd.Series, window: int = 21) -> pd.Series:
    log_ret = np.log(series / series.shift(1))
    return log_ret.rolling(window=window, min_periods=window).std() * np.sqrt(252) * 100


def pct_change_over(series: pd.Series, periods: int) -> float | None:
    if len(series) <= periods:
        return None
    prev = series.iloc[-1 - periods]
    if prev == 0 or pd.isna(prev):
        return None
    return float((series.iloc[-1] / prev - 1) * 100)


def build_signal(df: pd.DataFrame) -> dict:
    """Rule-based, transparent trend signal. Not investment advice."""
    close = df["Close"]
    last = close.iloc[-1]
    sma20 = sma(close, 20).iloc[-1]
    sma50 = sma(close, 50).iloc[-1]
    sma200 = sma(close, 200).iloc[-1] if len(close) >= 200 else np.nan
    last_rsi = rsi(close).iloc[-1]
    macd_line, signal_line, hist = macd(close)
    macd_hist_last = hist.iloc[-1]

    score = 0
    reasons = []

    if not np.isnan(sma20) and not np.isnan(sma50):
        if sma20 > sma50:
            score += 1
            reasons.append("SMA20 above SMA50 (short-term uptrend)")
        else:
            score -= 1
            reasons.append("SMA20 below SMA50 (short-term downtrend)")

    if not np.isnan(sma200):
        if last > sma200:
            score += 1
            reasons.append("Price above SMA200 (long-term uptrend)")
        else:
            score -= 1
            reasons.append("Price below SMA200 (long-term downtrend)")

    if last_rsi >= 70:
        score -= 1
        reasons.append(f"RSI {last_rsi:.0f} is overbought")
    elif last_rsi <= 30:
        score += 1
        reasons.append(f"RSI {last_rsi:.0f} is oversold")
    else:
        reasons.append(f"RSI {last_rsi:.0f} is neutral")

    if not np.isnan(macd_hist_last):
        if macd_hist_last > 0:
            score += 1
            reasons.append("MACD histogram positive (bullish momentum)")
        else:
            score -= 1
            reasons.append("MACD histogram negative (bearish momentum)")

    if score >= 2:
        label = "Buy"
    elif score <= -2:
        label = "Sell"
    else:
        label = "Hold"

    return {
        "label": label,
        "score": score,
        "reasons": reasons,
        "rsi": None if np.isnan(last_rsi) else round(float(last_rsi), 2),
    }


def dataframe_to_series(df: pd.DataFrame) -> list[dict]:
    close = df["Close"]
    sma20 = sma(close, 20)
    sma50 = sma(close, 50)
    sma200 = sma(close, 200)
    bb_up, bb_mid, bb_low = bollinger_bands(close)
    r = rsi(close)
    macd_line, signal_line, hist = macd(close)
    vol = annualized_volatility(close)

    out = []
    for ts, row in df.iterrows():
        i = df.index.get_loc(ts)
        out.append({
            "date": ts.strftime("%Y-%m-%d"),
            "open": _n(row["Open"]),
            "high": _n(row["High"]),
            "low": _n(row["Low"]),
            "close": _n(row["Close"]),
            "volume": _n(row["Volume"]),
            "sma20": _n(sma20.iloc[i]),
            "sma50": _n(sma50.iloc[i]),
            "sma200": _n(sma200.iloc[i]),
            "bbUpper": _n(bb_up.iloc[i]),
            "bbMid": _n(bb_mid.iloc[i]),
            "bbLower": _n(bb_low.iloc[i]),
            "rsi": _n(r.iloc[i]),
            "macd": _n(macd_line.iloc[i]),
            "macdSignal": _n(signal_line.iloc[i]),
            "macdHist": _n(hist.iloc[i]),
            "volatility": _n(vol.iloc[i]),
        })
    return out


def _n(v):
    if v is None or (isinstance(v, float) and np.isnan(v)):
        return None
    return round(float(v), 4)


def build_seasonality(df: pd.DataFrame, years: int = 10) -> dict:
    """Average cumulative return by calendar day across past years vs. the current year."""
    close = df["Close"].copy()
    close.index = pd.to_datetime(close.index).tz_localize(None)
    # Drop Feb 29 so day-of-year stays 1-365 across leap and non-leap years alike.
    close = close[~((close.index.month == 2) & (close.index.day == 29))]

    frame = pd.DataFrame({"close": close})
    frame["year"] = frame.index.year
    frame["doy"] = frame.index.dayofyear

    current_year = frame["year"].max()
    pct_from_year_start = frame.groupby("year")["close"].transform(lambda s: (s / s.iloc[0] - 1) * 100)
    frame["pct"] = pct_from_year_start

    history_years = sorted(y for y in frame["year"].unique() if y < current_year)
    history_years = history_years[-years:]
    historical = frame[frame["year"].isin(history_years)]
    seasonal_avg = historical.groupby("doy")["pct"].mean()
    seasonal_count = historical.groupby("doy")["pct"].count()

    current = frame[frame["year"] == current_year].set_index("doy")["pct"]

    ref_year = 2001  # non-leap reference year for day-of-year -> "Mon DD" labels
    series = []
    for doy in range(1, 366):
        label = (pd.Timestamp(year=ref_year, month=1, day=1) + pd.Timedelta(days=doy - 1)).strftime("%b %d")
        series.append({
            "doy": doy,
            "label": label,
            "seasonalAvg": _n(seasonal_avg.get(doy)),
            "yearsSampled": int(seasonal_count.get(doy, 0)),
            "currentYear": _n(current.get(doy)),
        })

    return {
        "currentYear": int(current_year),
        "yearsCovered": len(history_years),
        "series": series,
    }

import time
from concurrent.futures import ThreadPoolExecutor
from typing import Optional

import numpy as np
import pandas as pd
import yfinance as yf
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

import db
from analysis import build_seasonality, build_signal, dataframe_to_series, pct_change_over
from backtest import backtest_signal
from commodities import BY_SYMBOL, COMMODITIES, SECTORS
from screener import build_screener_entry
from sentiment import aggregate_sentiment, score_headlines

app = FastAPI(title="Commodities Dashboard API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

_CACHE: dict[str, tuple[float, object]] = {}
_TTL_SECONDS = 60 * 5  # 5 minutes — futures data doesn't need to be tighter than this for a dashboard


def cache_get(key: str):
    hit = _CACHE.get(key)
    if hit and time.time() - hit[0] < _TTL_SECONDS:
        return hit[1]
    return None


def cache_set(key: str, value):
    _CACHE[key] = (time.time(), value)


def _validate_symbol(symbol: str) -> str:
    if symbol not in BY_SYMBOL:
        raise HTTPException(status_code=404, detail=f"Unknown symbol '{symbol}'")
    return symbol


def _full_history(symbol: str) -> pd.DataFrame:
    """The symbol's complete stored daily history, topped up from Yahoo Finance
    if stale. Cached in-process for the TTL window since it's read on almost
    every endpoint for a given symbol within a short span of requests."""
    cache_key = f"fullhist:{symbol}"
    cached = cache_get(cache_key)
    if cached is not None:
        return cached
    df = db.ensure_history(symbol)
    if df.empty:
        raise HTTPException(status_code=502, detail=f"No data returned for '{symbol}'")
    cache_set(cache_key, df)
    return df


def _history(symbol: str, period: str, interval: str = "1d") -> pd.DataFrame:
    if interval != "1d":
        # Intraday bars aren't persisted — not currently used by the frontend,
        # so fetch directly rather than growing the schema for it.
        df = yf.Ticker(symbol).history(period=period, interval=interval, auto_adjust=True)
        if df.empty:
            raise HTTPException(status_code=502, detail=f"No data returned for '{symbol}'")
        return df
    return db.slice_period(_full_history(symbol), period)


def _safe_full_history(symbol: str) -> pd.DataFrame:
    try:
        return _full_history(symbol)
    except HTTPException:
        return pd.DataFrame()


@app.get("/api/commodities")
def list_commodities():
    return {"commodities": COMMODITIES, "sectors": SECTORS}


@app.get("/api/overview")
def overview(period: str = "6mo"):
    cache_key = f"overview:{period}"
    cached = cache_get(cache_key)
    if cached is not None:
        return cached

    with ThreadPoolExecutor(max_workers=8) as pool:
        histories = dict(zip(
            (c["symbol"] for c in COMMODITIES),
            pool.map(lambda c: _safe_full_history(c["symbol"]), COMMODITIES),
        ))

    results = []
    for c in COMMODITIES:
        symbol = c["symbol"]
        df = db.slice_period(histories.get(symbol, pd.DataFrame()), period)
        if df.empty:
            results.append({**c, "available": False})
            continue
        close = df["Close"].dropna()
        last = float(close.iloc[-1])
        change1d = pct_change_over(close, 1)
        change5d = pct_change_over(close, 5)
        change1m = pct_change_over(close, 21)
        sparkline = [round(float(v), 4) for v in close.tail(30).tolist()]
        results.append({
            **c,
            "available": True,
            "last": round(last, 4),
            "change1d": None if change1d is None else round(change1d, 2),
            "change5d": None if change5d is None else round(change5d, 2),
            "change1m": None if change1m is None else round(change1m, 2),
            "sparkline": sparkline,
        })

    payload = {"asOf": pd.Timestamp.utcnow().isoformat(), "commodities": results}
    cache_set(cache_key, payload)
    return payload


@app.get("/api/history/{symbol}")
def history(symbol: str, period: str = "1y", interval: str = "1d"):
    _validate_symbol(symbol)
    cache_key = f"series:{symbol}:{period}:{interval}"
    cached = cache_get(cache_key)
    if cached is not None:
        return cached
    df = _history(symbol, period, interval)
    payload = {
        "symbol": symbol,
        "meta": BY_SYMBOL[symbol],
        "series": dataframe_to_series(df),
    }
    cache_set(cache_key, payload)
    return payload


@app.get("/api/analysis/{symbol}")
def analysis(symbol: str, period: str = "1y"):
    _validate_symbol(symbol)
    cache_key = f"analysis:{symbol}:{period}"
    cached = cache_get(cache_key)
    if cached is not None:
        return cached
    df = _history(symbol, period)
    close = df["Close"]
    signal = build_signal(df)
    payload = {
        "symbol": symbol,
        "meta": BY_SYMBOL[symbol],
        "last": round(float(close.iloc[-1]), 4),
        "change1d": pct_change_over(close, 1),
        "change5d": pct_change_over(close, 5),
        "change1m": pct_change_over(close, 21),
        "change3m": pct_change_over(close, 63),
        "change1y": pct_change_over(close, 252),
        "52wHigh": round(float(close.tail(252).max()), 4) if len(close) else None,
        "52wLow": round(float(close.tail(252).min()), 4) if len(close) else None,
        "signal": signal,
    }
    cache_set(cache_key, payload)
    return payload


@app.get("/api/correlation")
def correlation(period: str = "6mo"):
    cache_key = f"corr:{period}"
    cached = cache_get(cache_key)
    if cached is not None:
        return cached

    symbols = [c["symbol"] for c in COMMODITIES]
    with ThreadPoolExecutor(max_workers=8) as pool:
        histories = dict(zip(symbols, pool.map(_safe_full_history, symbols)))

    closes = {}
    for symbol in symbols:
        s = db.slice_period(histories.get(symbol, pd.DataFrame()), period)
        s = s["Close"].dropna() if not s.empty else pd.Series(dtype=float)
        if not s.empty:
            closes[symbol] = s

    frame = pd.DataFrame(closes).pct_change().dropna(how="all")
    corr = frame.corr()
    corr = corr.replace({np.nan: None})

    matrix = []
    for row_symbol in corr.index:
        for col_symbol in corr.columns:
            val = corr.loc[row_symbol, col_symbol]
            matrix.append({
                "x": row_symbol,
                "y": col_symbol,
                "value": None if val is None else round(float(val), 3),
            })

    payload = {"symbols": list(corr.index), "matrix": matrix}
    cache_set(cache_key, payload)
    return payload


@app.get("/api/seasonality/{symbol}")
def seasonality(symbol: str, years: int = 10):
    _validate_symbol(symbol)
    years = max(3, min(years, 25))
    cache_key = f"seasonality:{symbol}:{years}"
    cached = cache_get(cache_key)
    if cached is not None:
        return cached
    df = _history(symbol, f"{years + 1}y")
    payload = {"symbol": symbol, "meta": BY_SYMBOL[symbol], **build_seasonality(df, years)}
    cache_set(cache_key, payload)
    return payload


def _fetch_news_raw(symbol: str, limit: int = 8) -> list[dict]:
    cache_key = f"newsraw:{symbol}:{limit}"
    cached = cache_get(cache_key)
    if cached is not None:
        return cached
    try:
        items = yf.Ticker(symbol).news or []
    except Exception:
        items = []

    out = []
    for item in items[:limit]:
        content = item.get("content", item)
        title = content.get("title") or item.get("title")
        if not title:
            continue
        link = (content.get("canonicalUrl") or {}).get("url") or (content.get("clickThroughUrl") or {}).get("url") or item.get("link")
        publisher = (content.get("provider") or {}).get("displayName") or item.get("publisher")
        pub_date = content.get("pubDate") or item.get("providerPublishTime")
        out.append({"title": title, "link": link, "publisher": publisher, "publishedAt": pub_date})

    cache_set(cache_key, out)
    return out


@app.get("/api/news/{symbol}")
def news(symbol: str, limit: int = 8):
    _validate_symbol(symbol)
    cache_key = f"news:{symbol}:{limit}"
    cached = cache_get(cache_key)
    if cached is not None:
        return cached

    raw = _fetch_news_raw(symbol, limit)
    scored = score_headlines(raw)
    payload = {"symbol": symbol, "items": scored, "sentiment": aggregate_sentiment(scored)}
    cache_set(cache_key, payload)
    return payload


@app.get("/api/screener")
def screener():
    cache_key = "screener"
    cached = cache_get(cache_key)
    if cached is not None:
        return cached

    def score_one(c):
        symbol = c["symbol"]
        full = _safe_full_history(symbol)
        if full.empty:
            return None
        recent = db.slice_period(full, "6mo")
        news_items = _fetch_news_raw(symbol, limit=8)
        sentiment_summary = aggregate_sentiment(score_headlines(news_items))
        entry = build_screener_entry(c, recent, sentiment_summary)
        entry["backtest"] = backtest_signal(full)
        return entry

    with ThreadPoolExecutor(max_workers=8) as pool:
        entries = list(pool.map(score_one, COMMODITIES))
    entries = [e for e in entries if e is not None]
    entries.sort(key=lambda e: e["compositeScore"], reverse=True)

    payload = {"asOf": pd.Timestamp.utcnow().isoformat(), "entries": entries}
    cache_set(cache_key, payload)
    return payload


@app.get("/api/backtest/{symbol}")
def backtest(symbol: str, forward_days: int = 21):
    _validate_symbol(symbol)
    forward_days = max(5, min(forward_days, 126))
    cache_key = f"backtest:{symbol}:{forward_days}"
    cached = cache_get(cache_key)
    if cached is not None:
        return cached
    df = _full_history(symbol)
    payload = {"symbol": symbol, "meta": BY_SYMBOL[symbol], **backtest_signal(df, forward_days=forward_days)}
    cache_set(cache_key, payload)
    return payload


@app.get("/api/db-status")
def db_status():
    return db.stats()


@app.get("/api/health")
def health():
    return {"status": "ok"}

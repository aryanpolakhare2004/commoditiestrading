import time
from typing import Optional

import numpy as np
import pandas as pd
import yfinance as yf
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from analysis import build_signal, dataframe_to_series, pct_change_over
from commodities import BY_SYMBOL, COMMODITIES, SECTORS

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


def _history(symbol: str, period: str, interval: str = "1d") -> pd.DataFrame:
    cache_key = f"hist:{symbol}:{period}:{interval}"
    cached = cache_get(cache_key)
    if cached is not None:
        return cached
    df = yf.Ticker(symbol).history(period=period, interval=interval, auto_adjust=True)
    if df.empty:
        raise HTTPException(status_code=502, detail=f"No data returned for '{symbol}'")
    cache_set(cache_key, df)
    return df


@app.get("/api/commodities")
def list_commodities():
    return {"commodities": COMMODITIES, "sectors": SECTORS}


@app.get("/api/overview")
def overview(period: str = "6mo"):
    cache_key = f"overview:{period}"
    cached = cache_get(cache_key)
    if cached is not None:
        return cached

    symbols = [c["symbol"] for c in COMMODITIES]
    raw = yf.download(
        tickers=symbols,
        period=period,
        interval="1d",
        group_by="ticker",
        threads=True,
        auto_adjust=True,
        progress=False,
    )

    results = []
    for c in COMMODITIES:
        symbol = c["symbol"]
        try:
            df = raw[symbol].dropna(how="all")
        except Exception:
            df = pd.DataFrame()
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
    raw = yf.download(
        tickers=symbols,
        period=period,
        interval="1d",
        group_by="ticker",
        threads=True,
        auto_adjust=True,
        progress=False,
    )

    closes = {}
    for symbol in symbols:
        try:
            s = raw[symbol]["Close"].dropna()
        except Exception:
            continue
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


@app.get("/api/news/{symbol}")
def news(symbol: str, limit: int = 8):
    _validate_symbol(symbol)
    cache_key = f"news:{symbol}"
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

    payload = {"symbol": symbol, "items": out}
    cache_set(cache_key, payload)
    return payload


@app.get("/api/health")
def health():
    return {"status": "ok"}

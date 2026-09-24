"""Futures term structure — each commodity's forward curve across its next
listed contract months, pulled from Yahoo's individual-contract tickers
(e.g. CLZ26.NYM = WTI December 2026).

The curve's shape is data the continuous front-month series can't show:
- Backwardation (later months cheaper) usually means tight nearby supply,
  and a long position earns positive roll yield as each expiring contract
  is rolled into a cheaper one.
- Contango (later months dearer) means ample supply or storage cost, and a
  long position bleeds roll yield holding it.

Carry here is the annualized price gap from the front liquid contract to
the furthest one on the curve (up to six contracts out) — roughly what a
long rolling forward along the curve would earn (backwardation) or pay
(contango) if the curve's shape held. Measured across the whole curve
rather than just the first two months, because a contract in its final
weeks before expiry routinely trades several percent away from the next
one and would swamp a front-pair measure. Settlement-based and one day
stale at most — not a live quote.
"""

import logging
import time
from datetime import datetime

import pandas as pd
import yfinance as yf

# Expired and not-yet-listed contract months are expected misses; don't log each one.
logging.getLogger("yfinance").setLevel(logging.CRITICAL)

MONTH_CODES = "FGHJKMNQUVXZ"
ALL_MONTHS = list(range(1, 13))

# Yahoo root, exchange suffix, and the contract months that actually carry
# volume (thin months are skipped — their stale settles distort the curve).
CURVE_SPECS = {
    "CL=F": ("CL", "NYM", ALL_MONTHS),
    "BZ=F": ("BZ", "NYM", ALL_MONTHS),
    "NG=F": ("NG", "NYM", ALL_MONTHS),
    "RB=F": ("RB", "NYM", ALL_MONTHS),
    "HO=F": ("HO", "NYM", ALL_MONTHS),
    "GC=F": ("GC", "CMX", [2, 4, 6, 8, 10, 12]),
    "SI=F": ("SI", "CMX", [3, 5, 7, 9, 12]),
    "HG=F": ("HG", "CMX", [3, 5, 7, 9, 12]),
    "PL=F": ("PL", "NYM", [1, 4, 7, 10]),
    "PA=F": ("PA", "NYM", [3, 6, 9, 12]),
    "ALI=F": ("ALI", "CMX", ALL_MONTHS),
    "ZC=F": ("ZC", "CBT", [3, 5, 7, 9, 12]),
    "ZW=F": ("ZW", "CBT", [3, 5, 7, 9, 12]),
    "ZS=F": ("ZS", "CBT", [1, 3, 5, 7, 8, 9, 11]),
    "ZO=F": ("ZO", "CBT", [3, 5, 7, 9, 12]),
    "ZR=F": ("ZR", "CBT", [1, 3, 5, 7, 9, 11]),
    "ZM=F": ("ZM", "CBT", [1, 3, 5, 7, 8, 9, 10, 12]),
    "ZL=F": ("ZL", "CBT", [1, 3, 5, 7, 8, 9, 10, 12]),
    "KC=F": ("KC", "NYB", [3, 5, 7, 9, 12]),
    "SB=F": ("SB", "NYB", [3, 5, 7, 10]),
    "CT=F": ("CT", "NYB", [3, 5, 7, 10, 12]),
    "CC=F": ("CC", "NYB", [3, 5, 7, 9, 12]),
    "OJ=F": ("OJ", "NYB", [1, 3, 5, 7, 9, 11]),
    "DC=F": ("DC", "CME", ALL_MONTHS),
    "LE=F": ("LE", "CME", [2, 4, 6, 8, 10, 12]),
    "GF=F": ("GF", "CME", [1, 3, 4, 5, 8, 9, 10, 11]),
    "HE=F": ("HE", "CME", [2, 4, 5, 6, 7, 8, 10, 12]),
    "LBR=F": ("LBR", "CME", [1, 3, 5, 7, 9, 11]),
}

# Markets whose curve shape is dominated by a recurring seasonal pattern
# (heating/driving season, grilling season, herd cycles), so a steep
# front-month roll reflects the calendar more than today's supply balance.
SEASONAL_CURVES = {"NG=F", "RB=F", "HO=F", "HE=F", "LE=F", "GF=F", "DC=F"}

CONTRACTS_PER_CURVE = 6
# A couple of extra candidates per curve, for months that turn out to be
# expired, not yet listed, or too thin to keep.
_CANDIDATES_PER_CURVE = CONTRACTS_PER_CURVE + 2
# Past this day of the month, the current month's contract has expired or is
# in delivery for nearly every market here, so candidates start next month.
_SKIP_CURRENT_MONTH_AFTER_DAY = 10
_DOWNLOAD_CHUNK = 40
_FRONT_LIQUIDITY_FLOOR = 0.10  # a front month trading under 10% of the curve's busiest month is rolling off
_FLAT_THRESHOLD_PCT = 1.0  # |annualized carry| below this counts as flat

_TTL_SECONDS = 60 * 60  # curves are settlement-driven; hourly is plenty
_cache: dict = {"at": 0.0, "curves": None}


def _candidate_contracts(symbol: str, today=None) -> list[dict]:
    root, suffix, months = CURVE_SPECS[symbol]
    today = today or datetime.utcnow().date()
    out = []
    year, month = today.year, today.month
    if today.day > _SKIP_CURRENT_MONTH_AFTER_DAY:
        month += 1
        if month > 12:
            month, year = 1, year + 1
    while len(out) < _CANDIDATES_PER_CURVE:
        if month in months:
            out.append({
                "ticker": f"{root}{MONTH_CODES[month - 1]}{year % 100:02d}.{suffix}",
                "year": year,
                "month": month,
            })
        month += 1
        if month > 12:
            month, year = 1, year + 1
    return out


def _months_between(a: dict, b: dict) -> int:
    return (b["year"] - a["year"]) * 12 + (b["month"] - a["month"])


def summarize_curve(points: list[dict]) -> dict:
    """Shape statistics for a curve of {year, month, price} points, nearest first."""
    if len(points) < 2:
        return {"structure": None, "carryAnnualPct": None, "slopePct": None}
    front, last = points[0], points[-1]
    span = _months_between(front, last) or 1
    # Positive when deferred contracts are cheaper — what a long earns rolling forward.
    carry = (front["price"] / last["price"] - 1) * (12 / span) * 100
    slope = (last["price"] / front["price"] - 1) * 100
    if abs(carry) < _FLAT_THRESHOLD_PCT:
        structure = "flat"
    else:
        structure = "backwardation" if carry > 0 else "contango"
    return {
        "structure": structure,
        "carryAnnualPct": round(carry, 2),
        "slopePct": round(slope, 2),
        "spanMonths": span,
    }


def _download_chunk(tickers: list[str]) -> dict[str, dict]:
    raw = yf.download(tickers=tickers, period="5d", interval="1d", group_by="ticker",
                      threads=True, auto_adjust=False, progress=False)
    out = {}
    for t in tickers:
        try:
            df = raw[t].dropna(subset=["Close"])
        except (KeyError, TypeError):
            continue
        if df.empty:
            continue
        volume = df["Volume"].iloc[-1]
        out[t] = {
            "price": float(df["Close"].iloc[-1]),
            "volume": None if pd.isna(volume) else float(volume),
            "date": df.index[-1].normalize(),
        }
    return out


def _download_last_closes(tickers: list[str]) -> dict[str, dict]:
    """Chunked, with one retry pass for whatever came back empty — Yahoo
    rate-limits a single ~200-ticker burst partway through, dropping
    arbitrary live contracts along with the expected expired ones."""
    out = {}
    for i in range(0, len(tickers), _DOWNLOAD_CHUNK):
        out.update(_download_chunk(tickers[i:i + _DOWNLOAD_CHUNK]))
    missing = [t for t in tickers if t not in out]
    if missing and out:
        time.sleep(2)
        for i in range(0, len(missing), _DOWNLOAD_CHUNK):
            out.update(_download_chunk(missing[i:i + _DOWNLOAD_CHUNK]))
    return out


def _clean_points(points: list[dict], latest_date) -> list[dict]:
    """Drop contracts that would distort the curve's front end: ones whose
    last print is stale (already expired, or not traded in days), and thin
    leading months in their final weeks before expiry, whose settles drift
    away from the rest of the curve as liquidity rolls out of them."""
    fresh = [p for p in points if (latest_date - p["date"]).days <= 1]
    volumes = [p["volume"] for p in fresh if p["volume"]]
    if not volumes:
        return fresh
    liquid_floor = max(volumes) * _FRONT_LIQUIDITY_FLOOR
    while len(fresh) > 2 and (fresh[0]["volume"] or 0) < liquid_floor:
        fresh = fresh[1:]
    return fresh


def all_curves() -> dict[str, dict]:
    """Every commodity's curve, fetched in a few batched requests and
    cached for an hour — ~220 contract tickers is enough that per-symbol
    requests would trip Yahoo's rate limit."""
    if _cache["curves"] is not None and time.time() - _cache["at"] < _TTL_SECONDS:
        return _cache["curves"]

    candidates = {s: _candidate_contracts(s) for s in CURVE_SPECS}
    tickers = [c["ticker"] for cands in candidates.values() for c in cands]
    try:
        closes = _download_last_closes(tickers)
    except Exception:
        # Keep serving the last good curves through a rate limit rather than nothing.
        return _cache["curves"] or {}

    if not closes:
        return _cache["curves"] or {}
    latest_date = max(c["date"] for c in closes.values())

    curves = {}
    for symbol, cands in candidates.items():
        points = [
            {**c, "label": f"{MONTH_CODES[c['month'] - 1]}{c['year'] % 100:02d}",
             "price": round(closes[c["ticker"]]["price"], 4), "volume": closes[c["ticker"]]["volume"],
             "date": closes[c["ticker"]]["date"]}
            for c in cands if c["ticker"] in closes
        ]
        points = _clean_points(points, latest_date)[:CONTRACTS_PER_CURVE]
        for p in points:
            p["date"] = p["date"].strftime("%Y-%m-%d")
        curves[symbol] = {"symbol": symbol, "seasonal": symbol in SEASONAL_CURVES,
                          "points": points, **summarize_curve(points)}

    if any(c["points"] for c in curves.values()):
        _cache.update(at=time.time(), curves=curves)
    return curves

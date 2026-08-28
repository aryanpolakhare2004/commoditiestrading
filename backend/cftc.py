"""CFTC Commitments of Traders (COT) positioning data.

Free, public, no API key — the CFTC publishes the Disaggregated Futures Only
report weekly via a Socrata Open Data API. This gives "Managed Money" net
positioning per commodity, a genuinely independent signal from price action:
speculative positioning can be stretched (crowded long/short) even when the
technical trend still looks fine, and mean-reverts on its own schedule.

Market names verified against the live dataset (see commit history) — CFTC
renames contracts over time (e.g. natural gas moved from "NATURAL GAS" to
"HENRY HUB"), so if a symbol goes stale here, the market name has probably
changed again and needs re-checking against the dataset's commodity_name
groupings, not just re-guessed.
"""

import urllib.parse
import urllib.request
import json
from datetime import datetime, timedelta

import numpy as np
import pandas as pd

import db

DATASET_URL = "https://publicreporting.cftc.gov/resource/72hh-3qpy.json"

# symbol -> CFTC market_and_exchange_names (exact match required by the API)
SYMBOL_TO_MARKET = {
    "CL=F": "WTI-PHYSICAL - NEW YORK MERCANTILE EXCHANGE",
    "BZ=F": "BRENT LAST DAY - NEW YORK MERCANTILE EXCHANGE",
    "NG=F": "HENRY HUB - NEW YORK MERCANTILE EXCHANGE",
    "RB=F": "GASOLINE RBOB - NEW YORK MERCANTILE EXCHANGE",
    "HO=F": "NY HARBOR ULSD - NEW YORK MERCANTILE EXCHANGE",
    "GC=F": "GOLD - COMMODITY EXCHANGE INC.",
    "SI=F": "SILVER - COMMODITY EXCHANGE INC.",
    "HG=F": "COPPER- #1 - COMMODITY EXCHANGE INC.",
    "PL=F": "PLATINUM - NEW YORK MERCANTILE EXCHANGE",
    "PA=F": "PALLADIUM - NEW YORK MERCANTILE EXCHANGE",
    "ALI=F": "ALUMINUM - COMMODITY EXCHANGE INC.",
    "ZC=F": "CORN - CHICAGO BOARD OF TRADE",
    "ZW=F": "WHEAT-SRW - CHICAGO BOARD OF TRADE",
    "ZS=F": "SOYBEANS - CHICAGO BOARD OF TRADE",
    "KC=F": "COFFEE C - ICE FUTURES U.S.",
    "SB=F": "SUGAR NO. 11 - ICE FUTURES U.S.",
    "CT=F": "COTTON NO. 2 - ICE FUTURES U.S.",
    "CC=F": "COCOA - ICE FUTURES U.S.",
    "OJ=F": "FRZN CONCENTRATED ORANGE JUICE - ICE FUTURES U.S.",
    "ZO=F": "OATS - CHICAGO BOARD OF TRADE",
    "ZR=F": "ROUGH RICE - CHICAGO BOARD OF TRADE",
    "ZM=F": "SOYBEAN MEAL - CHICAGO BOARD OF TRADE",
    "ZL=F": "SOYBEAN OIL - CHICAGO BOARD OF TRADE",
    "DC=F": "MILK, Class III - CHICAGO MERCANTILE EXCHANGE",
    "LE=F": "LIVE CATTLE - CHICAGO MERCANTILE EXCHANGE",
    "GF=F": "FEEDER CATTLE - CHICAGO MERCANTILE EXCHANGE",
    "HE=F": "LEAN HOGS - CHICAGO MERCANTILE EXCHANGE",
    "LBR=F": "LUMBER - CHICAGO MERCANTILE EXCHANGE",
}

_FRESH_WITHIN_DAYS = 6  # COT reports are weekly (Fridays, for the prior Tuesday)


def _fetch(market_name: str, since: str | None = None) -> list[dict]:
    params = {
        "market_and_exchange_names": market_name,
        "$order": "report_date_as_yyyy_mm_dd ASC",
        "$limit": 5000,
    }
    if since:
        params["$where"] = f"report_date_as_yyyy_mm_dd > '{since}T00:00:00.000'"
    url = f"{DATASET_URL}?{urllib.parse.urlencode(params)}"
    try:
        with urllib.request.urlopen(url, timeout=20) as resp:
            return json.load(resp)
    except Exception:
        return []


def _num(r: dict, key: str):
    v = r.get(key)
    if v is None or v == "":
        return None
    try:
        return float(v)
    except (ValueError, TypeError):
        return None


def _upsert(conn, symbol: str, rows: list[dict]) -> None:
    if not rows:
        return
    values = []
    for r in rows:
        if "report_date_as_yyyy_mm_dd" not in r:
            continue
        values.append((
            symbol,
            r["report_date_as_yyyy_mm_dd"][:10],
            _num(r, "open_interest_all"),
            _num(r, "m_money_positions_long_all"),
            _num(r, "m_money_positions_short_all"),
            _num(r, "prod_merc_positions_long"),
            _num(r, "prod_merc_positions_short"),
        ))
    conn.executemany(
        """
        INSERT INTO cot_history (symbol, report_date, open_interest, managed_money_long, managed_money_short, producer_long, producer_short)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(symbol, report_date) DO UPDATE SET
            open_interest=excluded.open_interest,
            managed_money_long=excluded.managed_money_long,
            managed_money_short=excluded.managed_money_short,
            producer_long=excluded.producer_long,
            producer_short=excluded.producer_short
        """,
        values,
    )
    conn.commit()


def ensure_positioning(symbol: str) -> pd.DataFrame:
    """Full stored COT history for a symbol (empty if unmapped or CFTC is
    unreachable — callers must handle that; positioning is a bonus signal,
    never a required one)."""
    market_name = SYMBOL_TO_MARKET.get(symbol)
    if not market_name:
        return pd.DataFrame()

    conn = db.connect()
    try:
        last = conn.execute(
            "SELECT MAX(report_date) FROM cot_history WHERE symbol = ?", (symbol,)
        ).fetchone()[0]

        if last is None:
            rows = _fetch(market_name)
            _upsert(conn, symbol, rows)
        else:
            last_dt = datetime.strptime(last, "%Y-%m-%d").date()
            if (datetime.utcnow().date() - last_dt).days > _FRESH_WITHIN_DAYS:
                since = (last_dt - timedelta(days=3)).strftime("%Y-%m-%d")
                rows = _fetch(market_name, since=since)
                _upsert(conn, symbol, rows)

        df = pd.read_sql_query(
            "SELECT report_date, open_interest, managed_money_long, managed_money_short, producer_long, producer_short "
            "FROM cot_history WHERE symbol = ? ORDER BY report_date",
            conn, params=(symbol,), parse_dates=["report_date"], index_col="report_date",
        )
        return df
    finally:
        conn.close()


def positioning_signal(symbol: str) -> dict | None:
    """Net Managed Money position as a % of open interest, z-scored against
    its own trailing 3-year history. None if unmapped or too little history
    to compute a meaningful z-score."""
    df = ensure_positioning(symbol)
    if df.empty or len(df) < 26:  # need at least ~6 months of weekly reports
        return None

    net = df["managed_money_long"] - df["managed_money_short"]
    net_pct_oi = (net / df["open_interest"].replace(0, np.nan)) * 100

    window = net_pct_oi.tail(156)  # ~3 years of weekly reports
    mean, std = window.mean(), window.std()
    if std == 0 or pd.isna(std):
        return None

    latest = net_pct_oi.iloc[-1]
    z = (latest - mean) / std
    prior = net_pct_oi.iloc[-2] if len(net_pct_oi) > 1 else None

    return {
        "asOf": df.index[-1].strftime("%Y-%m-%d"),
        "isStale": (datetime.utcnow().date() - df.index[-1].date()).days > _FRESH_WITHIN_DAYS * 2,
        "netManagedMoneyPctOI": round(float(latest), 2),
        "priorNetManagedMoneyPctOI": None if prior is None or pd.isna(prior) else round(float(prior), 2),
        "zScore": round(float(z), 2),
        "historyWeeks": int(len(window)),
    }

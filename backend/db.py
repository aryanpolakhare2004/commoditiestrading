"""SQLite-backed price history store.

Replaces re-fetching the same OHLCV data from Yahoo Finance on every request
with a local, persistent cache: the first time a symbol is needed, its full
history is pulled and stored; every request after that reads from SQLite and
only pulls the days since the last stored date. This also gives the backtest
engine a long, stable history to work from without re-downloading it.
"""

import re
import sqlite3
from datetime import datetime, timedelta
from pathlib import Path

import pandas as pd
import yfinance as yf

DB_PATH = Path(__file__).parent / "data" / "commodities.db"
DB_PATH.parent.mkdir(exist_ok=True)

INITIAL_BACKFILL_PERIOD = "max"

_PERIOD_RE = re.compile(r"^(\d+)(d|mo|y)$")
_PERIOD_UNIT_DAYS = {"d": 1, "mo": 30, "y": 365}


def _period_to_days(period: str) -> int:
    match = _PERIOD_RE.match(period)
    if not match:
        return 365
    count, unit = match.groups()
    return int(count) * _PERIOD_UNIT_DAYS[unit]


def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH, timeout=30)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS price_history (
            symbol TEXT NOT NULL,
            date TEXT NOT NULL,
            open REAL,
            high REAL,
            low REAL,
            close REAL,
            volume REAL,
            PRIMARY KEY (symbol, date)
        )
        """
    )
    conn.execute("CREATE INDEX IF NOT EXISTS idx_price_symbol_date ON price_history(symbol, date)")

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS cot_history (
            symbol TEXT NOT NULL,
            report_date TEXT NOT NULL,
            open_interest REAL,
            managed_money_long REAL,
            managed_money_short REAL,
            producer_long REAL,
            producer_short REAL,
            PRIMARY KEY (symbol, report_date)
        )
        """
    )
    conn.execute("CREATE INDEX IF NOT EXISTS idx_cot_symbol_date ON cot_history(symbol, report_date)")

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            symbol TEXT NOT NULL,
            date TEXT NOT NULL,
            event_type TEXT NOT NULL,
            description TEXT NOT NULL,
            direction TEXT,
            magnitude REAL,
            detail TEXT,
            UNIQUE(symbol, date, event_type)
        )
        """
    )
    conn.execute("CREATE INDEX IF NOT EXISTS idx_events_symbol_date ON events(symbol, date)")

    return conn


# Public alias — cftc.py and events.py share this SQLite file and need their
# own tables in it without importing db's private name.
connect = _connect


def _safe_float(v):
    return None if v is None or pd.isna(v) else float(v)


def _upsert(conn: sqlite3.Connection, symbol: str, df: pd.DataFrame) -> None:
    if df.empty:
        return
    rows = [
        (
            symbol,
            ts.strftime("%Y-%m-%d"),
            _safe_float(row.get("Open")),
            _safe_float(row.get("High")),
            _safe_float(row.get("Low")),
            _safe_float(row.get("Close")),
            _safe_float(row.get("Volume")),
        )
        for ts, row in df.iterrows()
    ]
    conn.executemany(
        """
        INSERT INTO price_history (symbol, date, open, high, low, close, volume)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(symbol, date) DO UPDATE SET
            open=excluded.open, high=excluded.high, low=excluded.low,
            close=excluded.close, volume=excluded.volume
        """,
        rows,
    )
    conn.commit()


def _last_date(conn: sqlite3.Connection, symbol: str) -> str | None:
    row = conn.execute("SELECT MAX(date) FROM price_history WHERE symbol = ?", (symbol,)).fetchone()
    return row[0] if row else None


def _read(conn: sqlite3.Connection, symbol: str) -> pd.DataFrame:
    df = pd.read_sql_query(
        "SELECT date, open, high, low, close, volume FROM price_history WHERE symbol = ? ORDER BY date",
        conn,
        params=(symbol,),
        parse_dates=["date"],
        index_col="date",
    )
    return df.rename(columns={"open": "Open", "high": "High", "low": "Low", "close": "Close", "volume": "Volume"})


def ensure_history(symbol: str) -> pd.DataFrame:
    """Return the full stored daily history for a symbol, backfilling or
    topping it up from Yahoo Finance first if it's missing or stale."""
    conn = _connect()
    try:
        last = _last_date(conn, symbol)
        today = datetime.utcnow().date()

        if last is None:
            fresh = yf.Ticker(symbol).history(period=INITIAL_BACKFILL_PERIOD, interval="1d", auto_adjust=True)
            _upsert(conn, symbol, fresh)
        else:
            last_dt = datetime.strptime(last, "%Y-%m-%d").date()
            if last_dt < today:
                # Small overlap re-fetches the last couple of stored days too, in case
                # Yahoo revises a still-settling session's close after the fact.
                start = (last_dt - timedelta(days=3)).strftime("%Y-%m-%d")
                fresh = yf.Ticker(symbol).history(start=start, interval="1d", auto_adjust=True)
                _upsert(conn, symbol, fresh)

        return _read(conn, symbol)
    finally:
        conn.close()


def slice_period(df: pd.DataFrame, period: str) -> pd.DataFrame:
    """Approximate yfinance's own `period=` filtering over an already-fetched
    full-history DataFrame, so callers don't need network access per period."""
    if df.empty or period == "max":
        return df
    if period == "ytd":
        year_start = pd.Timestamp(year=df.index.max().year, month=1, day=1)
        return df[df.index >= year_start]
    cutoff = df.index.max() - pd.Timedelta(days=_period_to_days(period))
    return df[df.index >= cutoff]


def stats() -> dict:
    conn = _connect()
    try:
        rows = conn.execute(
            "SELECT symbol, COUNT(*), MIN(date), MAX(date) FROM price_history GROUP BY symbol"
        ).fetchall()
        return {
            symbol: {"rows": count, "from": min_date, "to": max_date}
            for symbol, count, min_date, max_date in rows
        }
    finally:
        conn.close()

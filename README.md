# Commodities Dashboard

A React + Python dashboard for researching commodity futures (energy, metals,
agriculture, livestock, materials) using data from Yahoo Finance
(`yfinance`), persisted in a local SQLite database. It's an **analysis tool,
not an execution tool** — you place trades on your own broker, informed by
what's here.

## What it does

- **Overview** — live price, 1D/5D/1M change, and a sparkline for 28
  commodity futures across Energy, Metals, Agriculture, Livestock, and
  Materials, a Finviz-style heatmap tile grid (1-day % change), and a
  1-month performance bar chart. Star any commodity to pin it to a Watchlist
  filter.
- **Detail view** (click any commodity) — organized into tabs:
  - **Chart** — a Yahoo-Finance-style hero chart (area fill, hover-synced
    price header, 5D–Max range buttons, optional SMA/Bollinger overlays) and
    volume. Supports comparing up to 4 other commodities, normalized to %
    change from the start of the range. CSV export of the full indicator
    history.
  - **Technicals** — RSI(14), MACD(12,26,9), 21-day annualized volatility.
  - **Risk & Backtest** — drawdown from peak, daily return distribution, and
    the historical backtest of the technical signal (see below).
  - **Seasonality** — this year's cumulative return by calendar day against
    the historical average.
  - **News** — recent headlines with per-item and aggregate sentiment.
- **Correlation** — a heatmap of how each commodity's daily returns correlate
  with every other one, over the trailing 6 months.
- **Suggestions** — a screener that ranks all 28 commodities by a
  transparent, additive score combining the technical trend signal, price
  momentum (1M/3M), and news sentiment (VADER), with each entry's historical
  backtest edge shown alongside it.
- **Alerts** — set a price or 1-day % change threshold per commodity; crossed
  thresholds flag the overview card and a badge on the Alerts tab. Checked
  against live data on every refresh, no push notifications.

### The "is this a buy" answer, and its limits

Two different things answer this, and it's worth knowing which is which:

1. **The technical signal** (`backend/analysis.py`) — SMA crossovers, RSI,
   MACD histogram, evaluated *today* — this drives the Buy/Sell/Hold badge
   and the screener's composite score.
2. **The backtest** (`backend/backtest.py`) — a genuinely separate,
   historical question: on *this specific instrument*, what actually
   happened over the following N trading days every time the technical
   signal looked the way it does now (or looked bearish), compared to a
   same-instrument baseline of all days? It reports sample size, average and
   median forward return, and win rate for each — so a thin sample or an
   edge near zero is visible, not hidden.

Neither forecasts a price. The backtest doesn't know why a setup worked or
didn't, doesn't account for transaction costs or slippage, and a positive
historical edge is not a promise it repeats. Treat both as inputs to your own
judgment, not a verdict.

## Running it

Two processes, run in separate terminals from the repo root.

**Backend** (FastAPI + yfinance + SQLite, port 8010):

```
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8010
```

**Frontend** (React + Vite, port 5173):

```
cd frontend
npm install
npm run dev
```

Then open **http://localhost:5173**. The frontend expects the API at
`http://127.0.0.1:8010` (see `frontend/src/api.js`). Port 8010 is used
instead of the more common 8000 to avoid clashing with other local services —
change it in both places if you'd rather use something else.

## Notes

- **Database**: `backend/data/commodities.db` (SQLite, gitignored — it's a
  regenerable cache, not source data). The first request for a symbol
  backfills its full available history from Yahoo Finance (`backend/db.py`);
  every request after that reads from SQLite and only pulls the days since
  the last stored date. The `/api/screener` endpoint touches all 28 symbols
  and can take up to a minute on a fully cold database; after that it's
  cached in-memory for 5 minutes like everything else. `/api/db-status`
  shows what's stored per symbol.
- Futures tickers use Yahoo's continuous-contract symbols (e.g. `GC=F` for
  gold, `CL=F` for WTI crude) — see `backend/commodities.py` for the full
  list and to add/remove instruments.
- The Buy/Sell/Hold signal (`backend/analysis.py`) is a simple, explainable
  rule (SMA crossovers + RSI + MACD histogram). The screener's composite
  score (`backend/screener.py`) adds momentum and sentiment on top of that
  same signal; the backtest (`backend/backtest.py`) is a separate, historical
  check on the technical signal alone. None of them is a recommendation to
  act on — see above.
- Sentiment scoring (`backend/sentiment.py`) uses VADER, a rule-based lexicon
  scorer tuned for short, informal text — no model download or API key
  required, but it's not a nuanced reader of financial nuance either.
- Watchlist and alerts are stored in the browser's `localStorage`, per
  browser — they don't sync across devices or survive clearing site data.

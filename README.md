# Commodities Dashboard

A React + Python dashboard for researching commodity futures (energy, metals,
agriculture, livestock) using live data from Yahoo Finance (`yfinance`). It's
an **analysis tool, not an execution tool** — you place trades on your own
broker, informed by what's here.

## What it does

- **Overview** — live price, 1D/5D/1M change, and a sparkline for 25 commodity
  futures across Energy, Metals, Agriculture, and Livestock, plus a 1-month
  performance bar chart across all of them. Star any commodity to pin it to a
  Watchlist filter.
- **Detail view** (click any commodity) — a Yahoo-Finance-style hero chart
  (area fill, hover-synced price header, 5D–Max range buttons) with optional
  SMA 20/50/200 and Bollinger Band overlays, volume, RSI(14), MACD(12,26,9),
  52-week high/low, seasonality (this year vs. the historical average by
  calendar day), news with per-headline sentiment, and a transparent
  rule-based Buy/Sell/Hold signal (with the reasons behind it). CSV export of
  the full indicator history.
- **Compare** — overlay up to 4 other commodities on the detail chart,
  normalized to % change from the start of the selected range, so instruments
  with very different price scales (gold vs. corn) plot sensibly together.
- **Correlation** — a heatmap of how each commodity's daily returns correlate
  with every other one, over the trailing 6 months.
- **Suggestions** — a screener that ranks all 25 commodities by a transparent,
  additive score combining the technical trend signal, price momentum
  (1M/3M), and news sentiment (VADER, scored on recent headlines). Not a
  prediction or a backtested strategy — a starting point for your own
  research.
- **Alerts** — set a price or 1-day % change threshold per commodity; crossed
  thresholds flag the overview card and a badge on the Alerts tab. Checked
  against live data on every refresh, no push notifications.

All analysis is computed server-side from real OHLCV history and real news
headlines — nothing here is a forecast or investment advice.

## Running it

Two processes, run in separate terminals from the repo root.

**Backend** (FastAPI + yfinance, port 8010):

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

- Market data is cached in-memory on the backend for 5 minutes to avoid
  hammering Yahoo Finance. The `/api/screener` endpoint fetches news for all
  25 symbols in parallel and can take a few seconds on a cold cache.
- Futures tickers use Yahoo's continuous-contract symbols (e.g. `GC=F` for
  gold, `CL=F` for WTI crude) — see `backend/commodities.py` for the full
  list and to add/remove instruments.
- The Buy/Sell/Hold signal (`backend/analysis.py`) is a simple, explainable
  rule (SMA crossovers + RSI + MACD histogram). The screener's composite
  score (`backend/screener.py`) adds momentum and sentiment on top of that
  same signal. Neither is a recommendation to act on.
- Sentiment scoring (`backend/sentiment.py`) uses VADER, a rule-based lexicon
  scorer tuned for short, informal text — no model download or API key
  required, but it's not a nuanced reader of financial nuance either.
- Watchlist and alerts are stored in the browser's `localStorage`, per
  browser — they don't sync across devices or survive clearing site data.

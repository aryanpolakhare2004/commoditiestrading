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
  - **Trade Setup** — daily and weekly classical pivot points, recent swing
    highs/lows, and a position-size calculator (account size, risk %, entry,
    stop → contracts, dollar risk, notional value) using reference contract
    specs (`backend/contracts.py`) — verify exact specs with your broker
    before sizing a real position, especially for the lower-confidence,
    thinner-traded contracts it flags.
  - **Related** — curated stocks and ETFs with direct exposure to this
    commodity (producers, consumers, processors, or a tracking ETF), each
    with live price, 1-day change, a sparkline, and its own VADER news
    sentiment (same scoring as the commodity's own News tab) — click a card
    to expand its headlines. See `backend/related_assets.py`.
  - **News** — recent headlines with per-item and aggregate sentiment.
- **Correlation** — a heatmap of how each commodity's daily returns correlate
  with every other one, over the trailing 6 months.
- **Suggestions** — a screener that ranks all 28 commodities by a
  transparent, additive score combining the technical trend signal, price
  momentum (1M/3M), and news sentiment (VADER), with each entry's historical
  backtest edge shown alongside it.
- **Alerts** — set a price or 1-day % change threshold per commodity; crossed
  thresholds flag the overview card and a badge on the Alerts tab. Checked
  against live data on every refresh (every 5 minutes while a tab is open).
  Optional browser notifications fire once, right when an alert first
  crosses its threshold — enable them from the Alerts tab.
- **Search** — a search box in the header jumps straight to any commodity by
  name, symbol, or sector.
- **Journal** — log your own trades (side, size, entry/exit, notes), with
  unrealized P&L marked against live prices for open positions, realized
  P&L/win-rate for closed ones, and an exposure-by-sector breakdown (gross
  and net) across whatever's currently open. Stored in `localStorage`,
  private to your browser.
- **Research** — a small version of a "research engine" pipeline: raw data →
  signals → event detection → asset mapping → EV scoring → backtest → ranked
  opportunities. See its own section below.
- **Calendar** — recurring release schedule for reports known to move these
  markets: EIA petroleum/nat-gas inventory (weekly), USDA WASDE and Cattle on
  Feed (monthly, approximate), CFTC COT (weekly). Computed, not fetched live
  — see `backend/calendar_events.py`.
- **Portfolio** — pick an investment amount and a set of commodities, choose
  an allocation method, and run a Monte Carlo simulation of the resulting
  portfolio. See its own section below.

## The Research pipeline

This follows a specific design goal: **don't build something that predicts
prices directly** — build something that keeps asking *what changed, what's
exposed to it, is it already priced in, and what's the risk/reward*, and
keeps the language-understanding and the number-crunching in separate,
inspectable stages instead of asking a model to do both at once.

```
raw data (price, CFTC positioning, news)
    -> signals (independent z-scored factors)          backend/signals.py
    -> event detection (rule-based, not LLM)            backend/events.py
    -> asset mapping (curated + correlation-based)       backend/relationships.py
    -> EV scoring                                        backend/opportunity.py
    -> backtest (the EV inputs come from here)           backend/backtest.py
    -> ranked opportunities                              GET /api/opportunities
```

- **Signals** (`backend/signals.py`) — five independent factors, each
  z-scored against its own trailing history, combined with documented
  (not backtested/optimized) starting weights: price momentum, trend vs.
  200-day average, **CFTC Commitments-of-Traders positioning** (Managed
  Money net position as % of open interest — a free, no-key public feed,
  see `backend/cftc.py`), realized volatility (a headwind, not a tailwind),
  and news sentiment.
- **Event detection** (`backend/events.py`) — mechanical, not AI: compares
  today's computed signals against their own recent history and flags
  crossings — a 200-day-average cross, a volatility or momentum z-score
  extreme, a technical signal flip, an unusually large week-over-week shift
  in CFTC positioning. Persisted to a SQLite `events` table so re-running
  detection on an already-scored day is a no-op, not a duplicate. Visible in
  the Research tab's "What Changed" feed and `GET /api/events`.
- **Asset mapping** (`backend/relationships.py`) — two independent sources,
  kept separate: curated commodity-complex groupings and known cross-complex
  economic links (corn as a cattle feed cost, the soybean crush spread,
  crude oil into RBOB/heating oil), plus a purely statistical
  correlation-based lookup computed from real daily returns. An event on one
  instrument surfaces both.
- **EV scoring** (`backend/opportunity.py`) — `EV = P(win) x Upside -
  P(loss) x Downside`, using the *actual* historical win rate and average
  win/loss size for the current setup (bullish or bearish) from the
  backtest — not an invented probability. Adjusted for backtest sample-size
  confidence, elevated volatility, and a liquidity percentile across the
  universe (based on trailing dollar volume). Every component of the final
  "opportunity score" ships in the API response, not just the number.
- **The "thesis"** shown per opportunity in the Research tab is a
  **template-assembled sentence from the structured facts above** — not
  LLM-generated prose. That's a deliberate, documented placeholder: the
  wider design calls for an LLM here specifically for its language strength
  (reading something like "Ghana's cocoa forecast was cut due to
  swollen-shoot disease" and extracting `{commodity: cocoa, factor: supply,
  direction: bullish, severity: high}`), while every number stays in
  deterministic Python. That step needs a live model API key and isn't
  wired in yet — see `backend/opportunity.py`'s docstring for where it slots
  in. FRED/EIA/USDA (rates, inventories, crop forecasts) are the same kind
  of documented-but-not-built extension, each needing its own free API key.

## Portfolio allocation & simulation

`backend/portfolio.py`, `POST /api/portfolio/simulate`. Two deliberately
separate steps, for the same reason the research pipeline keeps signals and
event detection apart:

1. **Allocation weights** come from a documented, deterministic rule —
   never a return forecast, because commodity expected returns aren't
   reliably estimable from history the way volatility is:
   - *Equal weight* — same dollar amount in every selected commodity.
   - *Risk parity (inverse volatility)* — more dollars to calmer
     commodities, fewer to volatile ones, so each position contributes
     roughly equal risk. The default, and the most defensible of the three
     since it doesn't require guessing which way anything is headed.
   - *Opportunity-tilted* — risk parity, nudged by up to 30% of the
     portfolio toward names with a stronger current technical score
     (`backend/analysis.py`'s signal, not the fuller Research composite).
     The cap is deliberate: a heuristic score can influence the allocation,
     never dominate it.
2. **The simulation** is a block bootstrap over real historical daily
   returns — it resamples the same calendar day's return across every
   selected commodity together (not independently per asset), so the
   correlation structure between them (energy names moving together,
   precious metals moving together) is preserved rather than assumed away
   by a parametric model. It answers "if the future drew from the same
   distribution of daily moves this history did, what range of outcomes
   results" — not a prediction of what will happen. Output is a full
   percentile fan (5th/25th/50th/75th/95th) over the chosen horizon, plus
   probability of loss and max-drawdown percentiles, all computed from
   thousands of resampled paths (2,000 by default).

The Portfolio tab asks how much to invest, which commodities, which method,
and which horizon, then shows both — the allocation table and the fan
chart — together, so the sizing decision and the honest range of what could
happen sit side by side.

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
- CFTC positioning data (`backend/cftc.py`) is free and needs no API key, but
  CFTC renames contracts over time (natural gas moved from "NATURAL GAS" to
  "HENRY HUB" at some point) — if a symbol's positioning goes stale, the
  market name has probably changed again and `SYMBOL_TO_MARKET` needs a
  re-check against the live dataset, not a re-guess. `GET
  /api/opportunities` is the heaviest endpoint (positioning backfill +
  price + news for all 28 symbols); expect up to ~30s on a fully cold cache,
  then 5-minute cached like everything else.
- Watchlist, alerts, and the trade journal are stored in the browser's
  `localStorage`, per browser — they don't sync across devices or survive
  clearing site data.
- Contract specs (`backend/contracts.py`) are reference data, cross-checked
  against Wikipedia for the long-standing major contracts but not fetched
  from an authoritative source — aluminum, milk, lumber, and rough rice are
  flagged `"confidence": "verify"` since those contracts are thinner-traded
  or have changed more recently. The position calculator surfaces that flag;
  always confirm against your broker before sizing a real position.
- Related stocks/ETFs (`backend/related_assets.py`) are curated, not derived
  — every ticker was checked against Yahoo Finance before being added, but a
  few obvious picks (BAL for cotton, NIB for cocoa, JO for coffee — all
  iPath commodity ETNs) have since been delisted and were swapped for equity
  alternatives instead. A handful of commodities (oats, rough rice, milk)
  don't have a good direct pure-play and fall back to a broad agriculture
  ETF (DBA). 74 tickers across the 28 commodities as of this writing (2-5
  each); each also carries its own VADER news sentiment via the same
  pipeline as the commodity's own News tab.

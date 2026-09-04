const BASE = "http://127.0.0.1:8010";

async function get(path) {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText}: ${body}`);
  }
  return res.json();
}

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const body2 = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText}: ${body2}`);
  }
  return res.json();
}

export const api = {
  commodities: () => get("/api/commodities"),
  overview: (period = "6mo") => get(`/api/overview?period=${period}`),
  history: (symbol, period = "1y", interval = "1d") =>
    get(`/api/history/${encodeURIComponent(symbol)}?period=${period}&interval=${interval}`),
  analysis: (symbol, period = "1y") =>
    get(`/api/analysis/${encodeURIComponent(symbol)}?period=${period}`),
  correlation: (period = "6mo") => get(`/api/correlation?period=${period}`),
  news: (symbol, limit = 8) => get(`/api/news/${encodeURIComponent(symbol)}?limit=${limit}`),
  seasonality: (symbol, years = 10) => get(`/api/seasonality/${encodeURIComponent(symbol)}?years=${years}`),
  screener: () => get(`/api/screener`),
  backtest: (symbol, forwardDays = 21) => get(`/api/backtest/${encodeURIComponent(symbol)}?forward_days=${forwardDays}`),
  opportunities: () => get(`/api/opportunities`),
  events: (days = 14) => get(`/api/events?days=${days}`),
  positioning: (symbol) => get(`/api/positioning/${encodeURIComponent(symbol)}`),
  contracts: () => get(`/api/contracts`),
  positionSize: (symbol, accountSize, riskPct, entry, stop) =>
    get(
      `/api/position-size?symbol=${encodeURIComponent(symbol)}&account_size=${accountSize}&risk_pct=${riskPct}&entry=${entry}&stop=${stop}`
    ),
  levels: (symbol) => get(`/api/levels/${encodeURIComponent(symbol)}`),
  calendar: (days = 21) => get(`/api/calendar?days=${days}`),
  related: (symbol) => get(`/api/related/${encodeURIComponent(symbol)}`),
  simulatePortfolio: (amount, symbols, method, horizonDays, numPaths = 2000) =>
    post("/api/portfolio/simulate", { amount, symbols, method, horizon_days: horizonDays, num_paths: numPaths }),
  newsFeed: (limitPerSymbol = 4) => get(`/api/news-feed?limit_per_symbol=${limitPerSymbol}`),
};

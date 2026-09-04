import { useMemo, useState } from "react";
import { api } from "../api.js";
import ComparePicker from "./ComparePicker.jsx";
import FanChart from "./FanChart.jsx";

const DEFAULT_SYMBOLS = ["GC=F", "CL=F", "ZC=F", "LE=F", "LBR=F"];
const MAX_SYMBOLS = 10;

const METHODS = [
  { key: "riskparity", label: "Risk parity (inverse volatility)", description: "More dollars to calmer commodities, fewer to volatile ones, so each position contributes roughly equal risk. Doesn't require guessing future returns." },
  { key: "equal", label: "Equal weight", description: "Same dollar amount in every selected commodity." },
  { key: "tilted", label: "Opportunity-tilted", description: "Risk parity, nudged (capped at 30% of the portfolio) toward names with a stronger current technical signal. The tilt is a heuristic score, not a return forecast." },
];

const HORIZONS = [
  { label: "1 Month", days: 21 },
  { label: "3 Months", days: 63 },
  { label: "6 Months", days: 126 },
  { label: "1 Year", days: 252 },
];

function fmtMoney(v) {
  return `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}
function fmtPct(v) {
  return `${v >= 0 ? "+" : ""}${(v * 100).toFixed(1)}%`;
}

export default function PortfolioPlanner({ allCommodities }) {
  const [amount, setAmount] = useState(10000);
  const [symbols, setSymbols] = useState(DEFAULT_SYMBOLS);
  const [method, setMethod] = useState("riskparity");
  const [horizonDays, setHorizonDays] = useState(63);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const nameBySymbol = useMemo(() => Object.fromEntries(allCommodities.map((c) => [c.symbol, c.name])), [allCommodities]);

  function run() {
    setError(null);
    setLoading(true);
    api
      .simulatePortfolio(amount, symbols, method, horizonDays)
      .then(setResult)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  return (
    <div>
      <div
        style={{
          fontSize: 11.5,
          color: "var(--text-muted)",
          background: "var(--surface-1)",
          border: "1px solid var(--border)",
          borderRadius: 8,
          padding: "8px 12px",
          marginBottom: 20,
        }}
      >
        The allocation comes from a documented, deterministic rule below — never a return forecast, since commodity
        returns aren't reliably predictable from history. The simulation is a bootstrap over real historical daily
        returns (resampling the same calendar day across every selected commodity together, to preserve how they
        actually move relative to each other) — it shows a range of what could have happened, not a prediction of
        what will. Not investment advice.
      </div>

      <div style={panelStyle}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Field label="How much would you like to invest?">
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ color: "var(--text-muted)" }}>$</span>
              <input type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} style={{ ...inputStyle, width: 140 }} />
            </div>
          </Field>

          <Field label={`Commodities (${symbols.length}/${MAX_SYMBOLS})`}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              {symbols.map((s) => (
                <span key={s} style={chipStyle}>
                  {nameBySymbol[s] || s}
                  <button
                    onClick={() => setSymbols((prev) => prev.filter((x) => x !== s))}
                    style={chipRemoveStyle}
                    aria-label={`Remove ${nameBySymbol[s] || s}`}
                  >
                    ×
                  </button>
                </span>
              ))}
              <ComparePicker
                allCommodities={allCommodities}
                excludeSymbols={symbols}
                onAdd={(s) => setSymbols((prev) => [...prev, s])}
                disabled={symbols.length >= MAX_SYMBOLS}
              />
            </div>
          </Field>

          <Field label="Allocation method">
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {METHODS.map((m) => (
                <label key={m.key} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 12.5, cursor: "pointer" }}>
                  <input type="radio" checked={method === m.key} onChange={() => setMethod(m.key)} style={{ marginTop: 2 }} />
                  <span>
                    <strong>{m.label}</strong>
                    <div style={{ color: "var(--text-muted)", fontSize: 11.5 }}>{m.description}</div>
                  </span>
                </label>
              ))}
            </div>
          </Field>

          <Field label="Simulation horizon">
            <div style={{ display: "flex", gap: 6 }}>
              {HORIZONS.map((h) => (
                <button
                  key={h.days}
                  onClick={() => setHorizonDays(h.days)}
                  style={{
                    ...periodButtonStyle,
                    background: horizonDays === h.days ? "var(--series-1)" : "transparent",
                    color: horizonDays === h.days ? "#fff" : "var(--text-secondary)",
                    borderColor: horizonDays === h.days ? "var(--series-1)" : "var(--border)",
                  }}
                >
                  {h.label}
                </button>
              ))}
            </div>
          </Field>

          <button onClick={run} disabled={symbols.length < 2 || loading} style={runButtonStyle}>
            {loading ? "Running simulation…" : "Run Simulation"}
          </button>
          {symbols.length < 2 && <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Pick at least 2 commodities.</div>}
          {error && <div style={{ fontSize: 12.5, color: "var(--critical)" }}>{error}</div>}
        </div>
      </div>

      {result && (
        <div style={{ marginTop: 20 }}>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginBottom: 16 }}>
            <Stat label="Median outcome" value={fmtMoney(result.amount * result.simulation.finalMultiplier.median)} sub={fmtPct(result.simulation.finalMultiplier.median - 1)} />
            <Stat
              label="5th percentile (downside)"
              value={fmtMoney(result.amount * result.simulation.finalMultiplier.p5)}
              sub={fmtPct(result.simulation.finalMultiplier.p5 - 1)}
              color="var(--delta-down)"
            />
            <Stat
              label="95th percentile (upside)"
              value={fmtMoney(result.amount * result.simulation.finalMultiplier.p95)}
              sub={fmtPct(result.simulation.finalMultiplier.p95 - 1)}
              color="var(--delta-up)"
            />
            <Stat label="Probability of loss" value={`${(result.simulation.probabilityOfLoss * 100).toFixed(0)}%`} />
            <Stat label="Median max drawdown" value={fmtPct(result.simulation.maxDrawdown.median)} color="var(--delta-down)" />
            <Stat label="Worst 5% case drawdown" value={fmtPct(result.simulation.maxDrawdown.p5Worst)} color="var(--delta-down)" />
            {result.diversification && (
              <Stat
                label="Diversification"
                value={result.diversification.rating}
                sub={`avg. pairwise correlation ${result.diversification.avgPairwiseCorrelation.toFixed(2)}`}
                color={
                  result.diversification.avgPairwiseCorrelation < 0.2
                    ? "var(--delta-up)"
                    : result.diversification.avgPairwiseCorrelation < 0.5
                      ? undefined
                      : "var(--delta-down)"
                }
              />
            )}
          </div>

          <div style={panelStyle}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>
              Simulated Portfolio Value ({result.simulation.numPaths.toLocaleString()} paths, {result.simulation.historicalDaysUsed} days of history resampled)
            </div>
            <FanChart days={result.simulation.days} pathPercentiles={result.simulation.pathPercentiles} amount={result.amount} />
          </div>

          <div style={{ ...panelStyle, marginTop: 16, overflowX: "auto" }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Allocation</div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
              <thead>
                <tr style={{ textAlign: "left", color: "var(--text-muted)", fontSize: 11 }}>
                  <th style={thStyle}>Commodity</th>
                  <th style={thStyle}>Weight</th>
                  <th style={thStyle}>Amount</th>
                  <th style={thStyle}>Last price</th>
                  <th style={thStyle}>Ann. volatility</th>
                  <th style={thStyle}>Technical score</th>
                  <th style={thStyle}>≈ contracts</th>
                </tr>
              </thead>
              <tbody>
                {result.allocation.map((a) => (
                  <tr key={a.symbol} style={{ borderTop: "1px solid var(--border)" }}>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: 600 }}>{a.name}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                        {a.symbol.replace("=F", "")} · {a.sector}
                      </div>
                    </td>
                    <td style={tdStyle}>{a.weight.toFixed(1)}%</td>
                    <td style={tdStyle}>{fmtMoney(a.dollarAmount)}</td>
                    <td style={tdStyle}>{a.lastPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                    <td style={tdStyle}>{a.volatility.toFixed(1)}%</td>
                    <td style={{ ...tdStyle, color: a.technicalScore >= 0 ? "var(--delta-up)" : "var(--delta-down)" }}>
                      {a.technicalScore >= 0 ? "+" : ""}
                      {a.technicalScore}
                    </td>
                    <td style={tdStyle}>{a.contractsEquivalent ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {result.excludedSymbols.length > 0 && (
              <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 10 }}>
                Excluded (insufficient data): {result.excludedSymbols.map((s) => nameBySymbol[s] || s).join(", ")}
              </div>
            )}
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 10 }}>
              "≈ contracts" is the fractional number of full futures contracts this dollar amount represents at the
              current price — most real allocations at this size won't be a whole number of contracts. Not a
              suggested order size; see the Trade Setup tab for real position sizing against a stop.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}

function Stat({ label, value, sub, color }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: color || "var(--text-primary)" }}>{value}</div>
      {sub && (
        <div style={{ fontSize: 11.5, color: color || "var(--text-muted)" }}>{sub}</div>
      )}
    </div>
  );
}

const panelStyle = {
  background: "var(--surface-1)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: 16,
};

const inputStyle = {
  border: "1px solid var(--border)",
  borderRadius: 8,
  padding: "7px 9px",
  fontSize: 13,
  background: "var(--surface-2)",
  color: "var(--text-primary)",
};

const chipStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  border: "1px solid var(--border)",
  borderRadius: 999,
  padding: "4px 8px 4px 10px",
  fontSize: 12,
  color: "var(--text-secondary)",
};

const chipRemoveStyle = {
  border: "none",
  background: "none",
  color: "var(--text-muted)",
  cursor: "pointer",
  fontSize: 14,
  lineHeight: 1,
  padding: "0 0 0 2px",
};

const periodButtonStyle = {
  border: "1px solid var(--border)",
  borderRadius: 999,
  padding: "5px 14px",
  fontSize: 12.5,
  cursor: "pointer",
};

const runButtonStyle = {
  border: "1px solid var(--series-1)",
  background: "var(--series-1)",
  color: "#fff",
  borderRadius: 8,
  padding: "10px 18px",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  alignSelf: "flex-start",
};

const thStyle = { padding: "0 10px 8px 0", fontWeight: 500 };
const tdStyle = { padding: "8px 10px 8px 0" };

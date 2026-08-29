import { useEffect, useState } from "react";
import { api } from "../api.js";

function LevelRow({ label, value, color }) {
  if (value === null || value === undefined) return null;
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, padding: "3px 0" }}>
      <span style={{ color: color || "var(--text-secondary)" }}>{label}</span>
      <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>{value.toLocaleString(undefined, { maximumFractionDigits: 4 })}</span>
    </div>
  );
}

function PivotTable({ title, pivots }) {
  if (!pivots) return <div style={{ color: "var(--text-muted)", fontSize: 12.5 }}>Not enough data.</div>;
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4 }}>
        {title} <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>(based on {pivots.basedOn})</span>
      </div>
      <LevelRow label="R3" value={pivots.r3} color="var(--delta-down)" />
      <LevelRow label="R2" value={pivots.r2} color="var(--delta-down)" />
      <LevelRow label="R1" value={pivots.r1} color="var(--delta-down)" />
      <LevelRow label="Pivot" value={pivots.pp} />
      <LevelRow label="S1" value={pivots.s1} color="var(--delta-up)" />
      <LevelRow label="S2" value={pivots.s2} color="var(--delta-up)" />
      <LevelRow label="S3" value={pivots.s3} color="var(--delta-up)" />
    </div>
  );
}

export default function TradeSetupPanel({ symbol, unit, lastPrice }) {
  const [levelsData, setLevelsData] = useState(null);
  const [spec, setSpec] = useState(null);
  const [accountSize, setAccountSize] = useState(50000);
  const [riskPct, setRiskPct] = useState(1);
  const [entry, setEntry] = useState(lastPrice ? String(lastPrice) : "");
  const [stop, setStop] = useState("");
  const [result, setResult] = useState(null);
  const [calcError, setCalcError] = useState(null);

  useEffect(() => {
    api.levels(symbol).then(setLevelsData).catch(() => setLevelsData(null));
    api
      .contracts()
      .then((d) => setSpec(d.specs[symbol] || null))
      .catch(() => setSpec(null));
    setEntry(lastPrice ? String(lastPrice) : "");
    setStop("");
    setResult(null);
  }, [symbol, lastPrice]);

  function calculate() {
    setCalcError(null);
    const e = parseFloat(entry);
    const s = parseFloat(stop);
    if (Number.isNaN(e) || Number.isNaN(s) || e === s) {
      setCalcError("Enter a valid entry and stop price (they must differ).");
      setResult(null);
      return;
    }
    api
      .positionSize(symbol, accountSize, riskPct, e, s)
      .then(setResult)
      .catch((err) => setCalcError(err.message));
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20 }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Key Levels</div>
        {levelsData ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <PivotTable title="Daily Pivots" pivots={levelsData.pivots.daily} />
            <PivotTable title="Weekly Pivots" pivots={levelsData.pivots.weekly} />
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4 }}>
                Recent Swing Highs (120d)
              </div>
              {levelsData.swings.highs.map((h) => (
                <LevelRow key={h.date} label={h.date} value={h.price} color="var(--delta-down)" />
              ))}
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", margin: "10px 0 4px" }}>
                Recent Swing Lows (120d)
              </div>
              {levelsData.swings.lows.map((l) => (
                <LevelRow key={l.date} label={l.date} value={l.price} color="var(--delta-up)" />
              ))}
            </div>
          </div>
        ) : (
          <div style={{ color: "var(--text-muted)", fontSize: 12.5 }}>Loading levels…</div>
        )}
      </div>

      <div>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Position Size Calculator</div>
        <div
          style={{
            fontSize: 11,
            color: "var(--text-muted)",
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "6px 10px",
            marginBottom: 12,
          }}
        >
          Reference contract specs{spec?.confidence === "verify" ? " (lower confidence for this contract — verify before use)" : ""}. Always confirm tick size, contract size, and margin with your broker or the exchange before sizing a real position.
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Field label="Account size ($)">
            <input type="number" value={accountSize} onChange={(e) => setAccountSize(e.target.value)} style={inputStyle} />
          </Field>
          <Field label="Risk per trade (%)">
            <input type="number" step="0.1" value={riskPct} onChange={(e) => setRiskPct(e.target.value)} style={inputStyle} />
          </Field>
          <Field label={`Entry price (${unit || ""})`}>
            <input type="number" step="any" value={entry} onChange={(e) => setEntry(e.target.value)} style={inputStyle} />
          </Field>
          <Field label={`Stop price (${unit || ""})`}>
            <input type="number" step="any" value={stop} onChange={(e) => setStop(e.target.value)} style={inputStyle} placeholder="e.g. below recent swing low" />
          </Field>
          <button onClick={calculate} style={buttonStyle}>
            Calculate
          </button>
        </div>

        {calcError && <div style={{ color: "var(--critical)", fontSize: 12.5, marginTop: 10 }}>{calcError}</div>}

        {result && (
          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 4 }}>
            <LevelRow label="Risk budget" value={result.dollarRiskBudget} />
            <LevelRow label="Risk per contract" value={result.riskPerContract} />
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderTop: "1px solid var(--border)", marginTop: 4 }}>
              <span style={{ fontWeight: 600 }}>Contracts</span>
              <span style={{ fontWeight: 700, fontSize: 18 }}>{result.contracts}</span>
            </div>
            <LevelRow label="Actual $ risk at this size" value={result.actualDollarRisk} />
            <LevelRow label="Approx. notional value" value={result.notionalValue} />
            {result.contracts === 0 && (
              <div style={{ color: "var(--warning)", fontSize: 12, marginTop: 6 }}>
                Risk budget is smaller than the risk of a single contract at this stop distance — 0 contracts fit
                your risk limit.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: 12, color: "var(--text-secondary)" }}>
      {label}
      {children}
    </label>
  );
}

const inputStyle = {
  border: "1px solid var(--border)",
  borderRadius: 8,
  padding: "7px 9px",
  fontSize: 13,
  background: "var(--surface-2)",
  color: "var(--text-primary)",
};

const buttonStyle = {
  border: "1px solid var(--series-1)",
  background: "var(--series-1)",
  color: "#fff",
  borderRadius: 8,
  padding: "8px 14px",
  fontSize: 13,
  fontWeight: 500,
  cursor: "pointer",
  marginTop: 4,
};

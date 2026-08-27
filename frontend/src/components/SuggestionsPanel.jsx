import { useEffect, useMemo, useState } from "react";
import { api } from "../api.js";

const VERDICT_STYLE = (verdict) => {
  if (verdict.includes("Buy")) return { bg: "rgba(12,163,12,0.12)", fg: "var(--good)" };
  if (verdict.includes("Sell")) return { bg: "rgba(208,59,59,0.12)", fg: "var(--critical)" };
  return { bg: "rgba(137,135,129,0.14)", fg: "var(--text-secondary)" };
};

function VerdictBadge({ verdict }) {
  const s = VERDICT_STYLE(verdict);
  return (
    <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 999, background: s.bg, color: s.fg, fontWeight: 600, fontSize: 12 }}>
      {verdict}
    </span>
  );
}

function ScoreTag({ label, value }) {
  const color = value > 0 ? "var(--delta-up)" : value < 0 ? "var(--delta-down)" : "var(--text-muted)";
  return (
    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
      {label} <span style={{ color, fontWeight: 600 }}>{value > 0 ? `+${value}` : value}</span>
    </span>
  );
}

const FILTERS = ["All", "Buy signals", "Sell signals"];

export default function SuggestionsPanel({ onSelect }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    api.screener().then(setData).catch((e) => setError(e.message));
  }, []);

  const entries = useMemo(() => {
    if (!data) return [];
    if (filter === "Buy signals") return data.entries.filter((e) => e.verdict.includes("Buy"));
    if (filter === "Sell signals") return data.entries.filter((e) => e.verdict.includes("Sell"));
    return data.entries;
  }, [data, filter]);

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
          marginBottom: 16,
        }}
      >
        Ranked by a simple, transparent rule: technical trend score + price momentum + news sentiment, added
        together — not a prediction or backtested strategy. Verify independently before acting.
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              border: "1px solid var(--border)",
              borderRadius: 999,
              padding: "5px 14px",
              fontSize: 13,
              cursor: "pointer",
              background: filter === f ? "var(--series-1)" : "transparent",
              color: filter === f ? "#fff" : "var(--text-secondary)",
              borderColor: filter === f ? "var(--series-1)" : "var(--border)",
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {error && <div style={{ color: "var(--critical)" }}>{error}</div>}
      {!data && !error && <div style={{ color: "var(--text-muted)" }}>Scoring all commodities — this can take a few seconds…</div>}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {entries.map((e) => (
          <div key={e.symbol} role="button" tabIndex={0} onClick={() => onSelect(e.symbol)} style={rowStyle}>
            <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{e.name}</span>
                <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
                  {e.symbol.replace("=F", "")} · {e.sector}
                </span>
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <ScoreTag label="Technical" value={e.technicalScore} />
                <ScoreTag label="Momentum" value={e.momentumScore} />
                <ScoreTag label="Sentiment" value={e.sentimentScore} />
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 14, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                  {e.last?.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </div>
                <div style={{ fontSize: 11, color: (e.change1d ?? 0) >= 0 ? "var(--delta-up)" : "var(--delta-down)" }}>
                  {(e.change1d ?? 0) >= 0 ? "+" : ""}
                  {e.change1d?.toFixed(2)}%
                </div>
              </div>
              <VerdictBadge verdict={e.verdict} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const rowStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 16,
  background: "var(--surface-1)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: "12px 16px",
  cursor: "pointer",
  textAlign: "left",
};

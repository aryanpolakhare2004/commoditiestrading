import { useEffect, useState } from "react";
import { api } from "../api.js";
import PriceChart from "./PriceChart.jsx";
import VolumeChart from "./VolumeChart.jsx";
import RsiChart from "./RsiChart.jsx";
import MacdChart from "./MacdChart.jsx";
import SignalBadge from "./SignalBadge.jsx";
import Delta from "./Delta.jsx";
import NewsList from "./NewsList.jsx";

const PERIODS = [
  { label: "3M", value: "3mo" },
  { label: "6M", value: "6mo" },
  { label: "1Y", value: "1y" },
  { label: "2Y", value: "2y" },
  { label: "5Y", value: "5y" },
];

export default function DetailView({ symbol, onBack }) {
  const [period, setPeriod] = useState("1y");
  const [history, setHistory] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [news, setNews] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setHistory(null);
    setAnalysis(null);
    setError(null);
    Promise.all([api.history(symbol, period), api.analysis(symbol, period)])
      .then(([h, a]) => {
        if (cancelled) return;
        setHistory(h);
        setAnalysis(a);
      })
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [symbol, period]);

  useEffect(() => {
    let cancelled = false;
    setNews(null);
    api
      .news(symbol)
      .then((n) => !cancelled && setNews(n))
      .catch(() => !cancelled && setNews({ items: [] }));
    return () => {
      cancelled = true;
    };
  }, [symbol]);

  const meta = history?.meta || analysis?.meta;

  return (
    <div>
      <button onClick={onBack} style={backButtonStyle}>
        ← Back to overview
      </button>

      {error && <div style={{ color: "var(--critical)", marginTop: 16 }}>{error}</div>}

      {meta && (
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginTop: 8 }}>
          <div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
              {meta.sector} · {meta.symbol.replace("=F", "")}
            </div>
            <h1 style={{ margin: "2px 0 6px", fontSize: 26 }}>{meta.name}</h1>
            {analysis && (
              <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
                <span style={{ fontSize: 28, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                  {analysis.last.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </span>
                <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{meta.unit}</span>
                <Delta value={analysis.change1d} label="1D" />
              </div>
            )}
          </div>
          {analysis && (
            <div style={{ textAlign: "right" }}>
              <SignalBadge label={analysis.signal.label} size="lg" />
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6, maxWidth: 260 }}>
                Rule-based technical signal — not investment advice.
              </div>
            </div>
          )}
        </div>
      )}

      {analysis && (
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginTop: 18, marginBottom: 18 }}>
          <Stat label="5D" value={<Delta value={analysis.change5d} />} />
          <Stat label="1M" value={<Delta value={analysis.change1m} />} />
          <Stat label="3M" value={<Delta value={analysis.change3m} />} />
          <Stat label="1Y" value={<Delta value={analysis.change1y} />} />
          <Stat label="52W High" value={analysis["52wHigh"]} />
          <Stat label="52W Low" value={analysis["52wLow"]} />
          <Stat label="RSI (14)" value={analysis.signal.rsi} />
        </div>
      )}

      {analysis && (
        <div style={panelStyle}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>
            Why: {analysis.signal.label}
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: "var(--text-secondary)", lineHeight: 1.6 }}>
            {analysis.signal.reasons.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      )}

      <div style={{ display: "flex", gap: 6, margin: "18px 0 4px" }}>
        {PERIODS.map((p) => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            style={{
              ...periodButtonStyle,
              background: period === p.value ? "var(--series-1)" : "transparent",
              color: period === p.value ? "#fff" : "var(--text-secondary)",
              borderColor: period === p.value ? "var(--series-1)" : "var(--border)",
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {history ? (
        <div style={panelStyle}>
          <PriceChart series={history.series} />
          <div style={{ marginTop: 4 }}>
            <VolumeChart series={history.series} />
          </div>
          <SectionLabel>RSI (14)</SectionLabel>
          <RsiChart series={history.series} />
          <SectionLabel>MACD (12, 26, 9)</SectionLabel>
          <MacdChart series={history.series} />
        </div>
      ) : (
        !error && <div style={{ ...panelStyle, color: "var(--text-muted)" }}>Loading chart data…</div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr)", gap: 16, marginTop: 16, marginBottom: 40 }}>
        <div style={panelStyle}>
          <SectionLabel>News</SectionLabel>
          {news ? <NewsList items={news.items} /> : <div style={{ color: "var(--text-muted)", fontSize: 13 }}>Loading news…</div>}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 14, fontVariantNumeric: "tabular-nums" }}>{value ?? "—"}</div>
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", margin: "16px 0 4px" }}>{children}</div>
  );
}

const backButtonStyle = {
  background: "none",
  border: "none",
  color: "var(--text-secondary)",
  fontSize: 13,
  cursor: "pointer",
  padding: 0,
};

const panelStyle = {
  background: "var(--surface-1)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: 16,
};

const periodButtonStyle = {
  border: "1px solid var(--border)",
  borderRadius: 999,
  padding: "4px 12px",
  fontSize: 12,
  cursor: "pointer",
};

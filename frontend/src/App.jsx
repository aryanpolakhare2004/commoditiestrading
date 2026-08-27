import { useEffect, useState } from "react";
import { api } from "./api.js";
import Overview from "./components/Overview.jsx";
import DetailView from "./components/DetailView.jsx";
import CorrelationView from "./components/CorrelationView.jsx";

export default function App() {
  const [tab, setTab] = useState("overview"); // overview | correlation
  const [selectedSymbol, setSelectedSymbol] = useState(null);
  const [meta, setMeta] = useState(null);
  const [overview, setOverview] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.commodities().then(setMeta).catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    let cancelled = false;
    api
      .overview()
      .then((d) => !cancelled && setOverview(d))
      .catch((e) => !cancelled && setError(e.message));
    const id = setInterval(() => {
      api.overview().then((d) => !cancelled && setOverview(d)).catch(() => {});
    }, 5 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "24px 20px 60px" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 8 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22 }}>Commodities Dashboard</h1>
          <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 2 }}>
            Live futures data via Yahoo Finance · updated every 5 minutes
          </div>
        </div>
        {selectedSymbol === null && (
          <nav style={{ display: "flex", gap: 6 }}>
            <TabButton active={tab === "overview"} onClick={() => setTab("overview")}>
              Overview
            </TabButton>
            <TabButton active={tab === "correlation"} onClick={() => setTab("correlation")}>
              Correlation
            </TabButton>
          </nav>
        )}
      </header>

      <div
        style={{
          fontSize: 11.5,
          color: "var(--text-muted)",
          background: "var(--surface-1)",
          border: "1px solid var(--border)",
          borderRadius: 8,
          padding: "8px 12px",
          marginBottom: 24,
        }}
      >
        Educational analysis only — not investment advice. Verify prices with your broker before placing any trade.
      </div>

      {error && <div style={{ color: "var(--critical)", marginBottom: 16 }}>Failed to load data: {error}</div>}

      {selectedSymbol ? (
        <DetailView symbol={selectedSymbol} onBack={() => setSelectedSymbol(null)} />
      ) : tab === "overview" ? (
        overview && meta ? (
          <Overview overview={overview} sectors={meta.sectors} onSelect={setSelectedSymbol} />
        ) : (
          !error && <div style={{ color: "var(--text-muted)" }}>Loading market data…</div>
        )
      ) : (
        <CorrelationView />
      )}
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        border: "1px solid var(--border)",
        borderRadius: 999,
        padding: "6px 16px",
        fontSize: 13,
        fontWeight: 500,
        cursor: "pointer",
        background: active ? "var(--series-1)" : "transparent",
        color: active ? "#fff" : "var(--text-secondary)",
        borderColor: active ? "var(--series-1)" : "var(--border)",
      }}
    >
      {children}
    </button>
  );
}

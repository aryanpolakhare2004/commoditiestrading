import { useEffect, useState } from "react";
import { api } from "../api.js";
import CorrelationHeatmap from "./CorrelationHeatmap.jsx";

export default function CorrelationView() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.correlation("6mo").then(setData).catch((e) => setError(e.message));
  }, []);

  return (
    <div style={panelStyle}>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Cross-Commodity Correlation</div>
      <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16 }}>
        Pearson correlation of daily returns over the trailing 6 months. Blue = moves together, red = moves opposite.
      </div>
      {error && <div style={{ color: "var(--critical)" }}>{error}</div>}
      {data ? (
        <CorrelationHeatmap symbols={data.symbols} matrix={data.matrix} />
      ) : (
        !error && <div style={{ color: "var(--text-muted)" }}>Loading correlation matrix…</div>
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

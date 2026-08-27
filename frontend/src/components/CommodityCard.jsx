import Sparkline from "./Sparkline.jsx";
import Delta from "./Delta.jsx";

export default function CommodityCard({ commodity, onSelect }) {
  const { name, symbol, sector, unit, last, change1d, change5d, sparkline, available } = commodity;

  if (!available) {
    return (
      <div style={cardStyle}>
        <div style={{ color: "var(--text-muted)", fontSize: 13 }}>{name}</div>
        <div style={{ color: "var(--text-muted)", marginTop: 8 }}>Data unavailable</div>
      </div>
    );
  }

  return (
    <button
      onClick={() => onSelect(symbol)}
      style={{ ...cardStyle, cursor: "pointer", textAlign: "left" }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)" }}>{name}</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
            {symbol.replace("=F", "")} · {sector}
          </div>
        </div>
        <Sparkline values={sparkline} positive={(change5d ?? 0) >= 0} />
      </div>
      <div style={{ marginTop: 12, display: "flex", alignItems: "baseline", gap: 10 }}>
        <span style={{ fontSize: 22, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
          {last?.toLocaleString(undefined, { maximumFractionDigits: 2 })}
        </span>
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{unit}</span>
      </div>
      <div style={{ marginTop: 6, display: "flex", gap: 12 }}>
        <Delta value={change1d} label="1D" />
        <Delta value={change5d} label="5D" />
      </div>
    </button>
  );
}

const cardStyle = {
  background: "var(--surface-1)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: 16,
  minWidth: 0,
  font: "inherit",
  color: "inherit",
};

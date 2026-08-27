import Sparkline from "./Sparkline.jsx";
import Delta from "./Delta.jsx";

export default function CommodityCard({ commodity, onSelect, watched, onToggleWatch, alertTriggered }) {
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
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(symbol)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onSelect(symbol);
      }}
      style={{
        ...cardStyle,
        cursor: "pointer",
        borderColor: alertTriggered ? "var(--critical)" : "var(--border)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleWatch(symbol);
              }}
              aria-label={watched ? "Remove from watchlist" : "Add to watchlist"}
              aria-pressed={watched}
              style={starButtonStyle}
            >
              <span style={{ color: watched ? "var(--warning)" : "var(--text-muted)" }}>{watched ? "★" : "☆"}</span>
            </button>
            <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)" }}>{name}</div>
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: 22 }}>
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
      <div style={{ marginTop: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 12 }}>
          <Delta value={change1d} label="1D" />
          <Delta value={change5d} label="5D" />
        </div>
        {alertTriggered && (
          <span style={{ fontSize: 11, fontWeight: 600, color: "var(--critical)" }} title="An alert threshold has been crossed">
            ⚠ Alert
          </span>
        )}
      </div>
    </div>
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
  textAlign: "left",
};

const starButtonStyle = {
  border: "none",
  background: "none",
  cursor: "pointer",
  fontSize: 16,
  lineHeight: 1,
  padding: 0,
};

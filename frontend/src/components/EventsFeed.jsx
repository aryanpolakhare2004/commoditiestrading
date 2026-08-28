const DIRECTION_STYLE = {
  bullish: { color: "var(--good)", icon: "▲" },
  bearish: { color: "var(--critical)", icon: "▼" },
  risk: { color: "var(--warning)", icon: "◆" },
};

function fmtDate(d) {
  return d?.slice(5);
}

export default function EventsFeed({ events, nameBySymbol, onSelect }) {
  if (!events || events.length === 0) {
    return <div style={{ color: "var(--text-muted)", fontSize: 13 }}>No material changes detected in this window.</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {events.map((e, i) => {
        const style = DIRECTION_STYLE[e.direction] || DIRECTION_STYLE.risk;
        return (
          <button key={i} onClick={() => onSelect(e.symbol)} style={rowStyle}>
            <span style={{ color: style.color, fontSize: 12, width: 14, flexShrink: 0 }}>{style.icon}</span>
            <span style={{ fontWeight: 600, fontSize: 12.5, flexShrink: 0, minWidth: 90 }}>
              {nameBySymbol[e.symbol] || e.symbol}
            </span>
            <span style={{ fontSize: 12.5, color: "var(--text-secondary)", flex: 1 }}>{e.description}</span>
            <span style={{ fontSize: 11, color: "var(--text-muted)", flexShrink: 0 }}>{fmtDate(e.date)}</span>
          </button>
        );
      })}
    </div>
  );
}

const rowStyle = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  border: "1px solid var(--border)",
  borderRadius: 8,
  padding: "8px 10px",
  background: "var(--surface-1)",
  cursor: "pointer",
  textAlign: "left",
  width: "100%",
};

const MAX_INTENSITY = 3; // % change that reaches full color saturation

function tileColor(change) {
  if (change === null || change === undefined) return "var(--grid)";
  const t = Math.min(1, Math.abs(change) / MAX_INTENSITY);
  const pct = Math.round(t * 55 + 10); // keep some color even for tiny moves, cap before it goes fully opaque
  const hue = change >= 0 ? "var(--delta-up)" : "var(--delta-down)";
  return `color-mix(in oklab, ${hue} ${pct}%, var(--surface-1))`;
}

export default function OverviewHeatmap({ commodities, onSelect }) {
  const available = commodities.filter((c) => c.available);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
        gap: 4,
      }}
    >
      {available.map((c) => (
        <button
          key={c.symbol}
          onClick={() => onSelect(c.symbol)}
          title={`${c.name}: ${c.change1d >= 0 ? "+" : ""}${c.change1d?.toFixed(2)}%`}
          style={{
            background: tileColor(c.change1d),
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "10px 8px",
            cursor: "pointer",
            textAlign: "left",
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--text-primary)" }}>{c.symbol.replace("=F", "")}</span>
          <span
            style={{
              fontSize: 12.5,
              fontWeight: 700,
              fontVariantNumeric: "tabular-nums",
              color: (c.change1d ?? 0) >= 0 ? "var(--delta-up)" : "var(--delta-down)",
            }}
          >
            {c.change1d === null || c.change1d === undefined ? "—" : `${c.change1d >= 0 ? "+" : ""}${c.change1d.toFixed(2)}%`}
          </span>
        </button>
      ))}
    </div>
  );
}

export default function Delta({ value, label }) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return (
      <span style={{ color: "var(--text-muted)", fontSize: 13 }}>
        {label ? `${label} —` : "—"}
      </span>
    );
  }
  const positive = value >= 0;
  const color = positive ? "var(--delta-up)" : "var(--delta-down)";
  const arrow = positive ? "▲" : "▼";
  return (
    <span style={{ color, fontSize: 13, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
      {label ? `${label} ` : ""}
      {arrow} {Math.abs(value).toFixed(2)}%
    </span>
  );
}

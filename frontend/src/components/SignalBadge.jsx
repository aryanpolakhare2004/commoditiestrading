const STYLES = {
  Buy: { bg: "rgba(12,163,12,0.12)", fg: "var(--good)", icon: "▲" },
  Sell: { bg: "rgba(208,59,59,0.12)", fg: "var(--critical)", icon: "▼" },
  Hold: { bg: "rgba(137,135,129,0.14)", fg: "var(--text-secondary)", icon: "■" },
};

export default function SignalBadge({ label, size = "md" }) {
  const style = STYLES[label] || STYLES.Hold;
  const pad = size === "lg" ? "6px 14px" : "3px 10px";
  const font = size === "lg" ? "15px" : "12px";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: pad,
        borderRadius: 999,
        background: style.bg,
        color: style.fg,
        fontWeight: 600,
        fontSize: font,
        letterSpacing: 0.2,
      }}
    >
      <span aria-hidden="true" style={{ fontSize: "0.7em" }}>
        {style.icon}
      </span>
      {label}
    </span>
  );
}

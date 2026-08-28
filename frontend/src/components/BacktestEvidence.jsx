function StatBlock({ title, summary, accent }) {
  if (!summary) {
    return (
      <div style={blockStyle}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>{title}</div>
        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Not enough historical instances.</div>
      </div>
    );
  }
  const positive = summary.avgReturn >= 0;
  return (
    <div style={blockStyle}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: positive ? "var(--delta-up)" : "var(--delta-down)", fontVariantNumeric: "tabular-nums" }}>
        {positive ? "+" : ""}
        {summary.avgReturn.toFixed(2)}%
      </div>
      <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 2 }}>average forward return</div>
      <div style={{ display: "flex", gap: 14, marginTop: 10, fontSize: 11.5, color: "var(--text-secondary)" }}>
        <span>
          Win rate <strong>{summary.winRate.toFixed(0)}%</strong>
        </span>
        <span>
          Median <strong>{summary.medianReturn >= 0 ? "+" : ""}{summary.medianReturn.toFixed(2)}%</strong>
        </span>
        <span>
          n=<strong>{summary.sampleSize.toLocaleString()}</strong>
        </span>
      </div>
      {accent}
    </div>
  );
}

export default function BacktestEvidence({ data }) {
  if (!data) {
    return <div style={{ color: "var(--text-muted)", fontSize: 13 }}>Loading backtest…</div>;
  }

  const edge = data.bullishEdgeVsBaseline;

  return (
    <div>
      <div
        style={{
          fontSize: 11.5,
          color: "var(--text-muted)",
          background: "var(--surface-2)",
          border: "1px solid var(--border)",
          borderRadius: 8,
          padding: "8px 12px",
          marginBottom: 14,
        }}
      >
        Historical, same-instrument statistics only — not a prediction. Answers: "on this commodity, what happened
        over the next {data.forwardDays} trading days each time the technical signal looked like this before?" A
        thin sample size or an edge near zero means the setup shows little to no historical advantage here.
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        <StatBlock title={`Bullish setup (score ≥ ${data.buyThreshold})`} summary={data.bullishSetup} />
        <StatBlock title="Baseline (all days)" summary={data.baseline} />
        <StatBlock title={`Bearish setup (score ≤ ${data.sellThreshold})`} summary={data.bearishSetup} />
      </div>

      {edge !== null && edge !== undefined && (
        <div style={{ marginTop: 14, fontSize: 12.5, color: "var(--text-secondary)" }}>
          Bullish-setup edge over baseline:{" "}
          <strong style={{ color: edge >= 0 ? "var(--delta-up)" : "var(--delta-down)" }}>
            {edge >= 0 ? "+" : ""}
            {edge.toFixed(2)} pp
          </strong>{" "}
          over {data.forwardDays} trading days.
        </div>
      )}
    </div>
  );
}

const blockStyle = {
  background: "var(--surface-1)",
  border: "1px solid var(--border)",
  borderRadius: 10,
  padding: 14,
};

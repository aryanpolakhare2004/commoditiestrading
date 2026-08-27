import { ComposedChart, Bar, Line, XAxis, YAxis, ReferenceLine, Tooltip, Legend, Cell, ResponsiveContainer } from "recharts";

function fmtDate(d) {
  return d?.slice(5);
}

function MacdTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div style={tooltipStyle}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{label}</div>
      <Row color="var(--series-1)" label="MACD" value={d.macd} />
      <Row color="var(--series-2)" label="Signal" value={d.macdSignal} />
      <Row color={d.macdHist >= 0 ? "var(--delta-up)" : "var(--delta-down)"} label="Hist" value={d.macdHist} />
    </div>
  );
}

function Row({ color, label, value }) {
  if (value === null || value === undefined) return null;
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 16, fontSize: 12 }}>
      <span style={{ color: "var(--text-secondary)" }}>
        <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: color, marginRight: 6 }} />
        {label}
      </span>
      <span style={{ fontVariantNumeric: "tabular-nums" }}>{value.toFixed(3)}</span>
    </div>
  );
}

export default function MacdChart({ series }) {
  return (
    <ResponsiveContainer width="100%" height={140}>
      <ComposedChart data={series} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
        <XAxis dataKey="date" tickFormatter={fmtDate} hide />
        <YAxis tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} width={48} />
        <ReferenceLine y={0} stroke="var(--axis)" />
        <Tooltip content={<MacdTooltip />} />
        <Legend wrapperStyle={{ fontSize: 11, color: "var(--text-secondary)" }} />
        <Bar dataKey="macdHist" name="Histogram" isAnimationActive={false} maxBarSize={5}>
          {series.map((d, i) => (
            <Cell key={i} fill={(d.macdHist ?? 0) >= 0 ? "var(--delta-up)" : "var(--delta-down)"} fillOpacity={0.55} />
          ))}
        </Bar>
        <Line type="monotone" dataKey="macd" name="MACD" stroke="var(--series-1)" strokeWidth={2} dot={false} isAnimationActive={false} />
        <Line type="monotone" dataKey="macdSignal" name="Signal" stroke="var(--series-2)" strokeWidth={2} dot={false} isAnimationActive={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

const tooltipStyle = {
  background: "var(--surface-2)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  padding: "8px 10px",
  boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
  minWidth: 160,
};

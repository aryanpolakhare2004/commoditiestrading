import { LineChart, Line, XAxis, YAxis, ReferenceLine, Tooltip, ResponsiveContainer } from "recharts";

function fmtDate(d) {
  return d?.slice(5);
}

function RsiTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length || payload[0].value === null) return null;
  return (
    <div style={tooltipStyle}>
      <div style={{ fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>RSI {payload[0].value.toFixed(1)}</div>
    </div>
  );
}

export default function RsiChart({ series }) {
  return (
    <ResponsiveContainer width="100%" height={110}>
      <LineChart data={series} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
        <XAxis dataKey="date" tickFormatter={fmtDate} hide />
        <YAxis domain={[0, 100]} ticks={[30, 50, 70]} tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} width={40} />
        <ReferenceLine y={70} stroke="var(--critical)" strokeDasharray="3 3" strokeOpacity={0.6} />
        <ReferenceLine y={30} stroke="var(--good)" strokeDasharray="3 3" strokeOpacity={0.6} />
        <Tooltip content={<RsiTooltip />} />
        <Line type="monotone" dataKey="rsi" name="RSI" stroke="var(--series-7)" strokeWidth={2} dot={false} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

const tooltipStyle = {
  background: "var(--surface-2)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  padding: "6px 10px",
  boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
};

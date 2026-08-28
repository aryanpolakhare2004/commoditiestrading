import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

function fmtDate(d) {
  return d?.slice(5);
}

function VolTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length || payload[0].value === null || payload[0].value === undefined) return null;
  return (
    <div style={tooltipStyle}>
      <div style={{ fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{payload[0].value.toFixed(1)}% annualized</div>
    </div>
  );
}

export default function VolatilityChart({ series }) {
  return (
    <ResponsiveContainer width="100%" height={110}>
      <AreaChart data={series} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
        <defs>
          <linearGradient id="volFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--series-2)" stopOpacity={0.22} />
            <stop offset="95%" stopColor="var(--series-2)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="date" tickFormatter={fmtDate} hide />
        <YAxis
          tickFormatter={(v) => `${v}%`}
          tick={{ fill: "var(--text-muted)", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          width={40}
        />
        <Tooltip content={<VolTooltip />} />
        <Area
          type="monotone"
          dataKey="volatility"
          name="Volatility"
          stroke="var(--series-2)"
          strokeWidth={2}
          fill="url(#volFill)"
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
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

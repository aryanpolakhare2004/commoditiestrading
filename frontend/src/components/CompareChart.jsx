import { LineChart, Line, XAxis, YAxis, CartesianGrid, ReferenceLine, Tooltip, Legend, ResponsiveContainer } from "recharts";

function fmtDate(d) {
  return d?.slice(5);
}

function CompareTooltip({ active, payload, label, seriesMeta }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={tooltipStyle}>
      <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 12 }}>{label}</div>
      {seriesMeta.map((s) => {
        const point = payload.find((p) => p.dataKey === s.symbol);
        if (!point || point.value === null || point.value === undefined) return null;
        return (
          <div key={s.symbol} style={{ display: "flex", justifyContent: "space-between", gap: 16, fontSize: 12 }}>
            <span style={{ color: "var(--text-secondary)" }}>
              <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: s.color, marginRight: 6 }} />
              {s.label}
            </span>
            <span style={{ fontVariantNumeric: "tabular-nums", color: point.value >= 0 ? "var(--delta-up)" : "var(--delta-down)" }}>
              {point.value >= 0 ? "+" : ""}
              {point.value.toFixed(2)}%
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function CompareChart({ data, seriesMeta }) {
  return (
    <ResponsiveContainer width="100%" height={360}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
        <CartesianGrid vertical={false} stroke="var(--grid)" />
        <XAxis
          dataKey="date"
          tickFormatter={fmtDate}
          tick={{ fill: "var(--text-muted)", fontSize: 11 }}
          axisLine={{ stroke: "var(--axis)" }}
          tickLine={false}
          minTickGap={64}
        />
        <YAxis
          tickFormatter={(v) => `${v > 0 ? "+" : ""}${v.toFixed(0)}%`}
          orientation="right"
          tick={{ fill: "var(--text-muted)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={54}
        />
        <ReferenceLine y={0} stroke="var(--axis)" />
        <Tooltip content={<CompareTooltip seriesMeta={seriesMeta} />} cursor={{ stroke: "var(--axis)", strokeWidth: 1 }} />
        <Legend
          wrapperStyle={{ fontSize: 12, color: "var(--text-secondary)" }}
          formatter={(value) => <span style={{ color: "var(--text-secondary)" }}>{value}</span>}
        />
        {seriesMeta.map((s) => (
          <Line
            key={s.symbol}
            type="monotone"
            dataKey={s.symbol}
            name={s.label}
            stroke={s.color}
            strokeWidth={s.primary ? 2.5 : 2}
            dot={false}
            isAnimationActive={false}
            connectNulls
          />
        ))}
      </LineChart>
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

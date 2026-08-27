import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Cell } from "recharts";

function TooltipContent({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;
  return (
    <div style={tooltipStyle}>
      <div style={{ fontWeight: 600, marginBottom: 2 }}>{d.name}</div>
      <div style={{ color: d.change1m >= 0 ? "var(--delta-up)" : "var(--delta-down)" }}>
        {d.change1m >= 0 ? "+" : ""}
        {d.change1m.toFixed(2)}% (1M)
      </div>
    </div>
  );
}

export default function SectorBar({ commodities }) {
  const data = commodities
    .filter((c) => c.available && c.change1m !== null && c.change1m !== undefined)
    .map((c) => ({ ...c, shortName: c.name, sym: c.symbol.replace("=F", "") }))
    .sort((a, b) => b.change1m - a.change1m);

  return (
    <div style={{ overflowX: "auto" }}>
      <BarChart
        width={Math.min(1080, data.length * 56 + 60)}
        height={280}
        data={data}
        margin={{ top: 8, right: 12, left: 4, bottom: 48 }}
        barCategoryGap={10}
      >
        <CartesianGrid vertical={false} stroke="var(--grid)" />
        <XAxis
          dataKey="sym"
          angle={-45}
          textAnchor="end"
          interval={0}
          height={60}
          tick={{ fill: "var(--text-muted)", fontSize: 11 }}
          axisLine={{ stroke: "var(--axis)" }}
          tickLine={false}
        />
        <YAxis
          tickFormatter={(v) => `${v}%`}
          tick={{ fill: "var(--text-muted)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={44}
        />
        <ReferenceLine y={0} stroke="var(--axis)" />
        <Tooltip content={<TooltipContent />} cursor={{ fill: "var(--grid)", opacity: 0.4 }} />
        <Bar dataKey="change1m" radius={[3, 3, 3, 3]} maxBarSize={28}>
          {data.map((d) => (
            <Cell key={d.symbol} fill={d.change1m >= 0 ? "var(--delta-up)" : "var(--delta-down)"} />
          ))}
        </Bar>
      </BarChart>
    </div>
  );
}

const tooltipStyle = {
  background: "var(--surface-2)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  padding: "8px 10px",
  fontSize: 12,
  color: "var(--text-primary)",
  boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
};

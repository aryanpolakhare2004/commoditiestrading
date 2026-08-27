import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

function fmtDate(d) {
  return d?.slice(5);
}

function PriceTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;
  return (
    <div style={tooltipStyle}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{label}</div>
      <Row color="var(--text-primary)" label="Close" value={d.close} />
      <Row color="var(--series-1)" label="SMA 20" value={d.sma20} />
      <Row color="var(--series-2)" label="SMA 50" value={d.sma50} />
      <Row color="var(--series-3)" label="SMA 200" value={d.sma200} />
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
      <span style={{ fontVariantNumeric: "tabular-nums" }}>{value.toFixed(2)}</span>
    </div>
  );
}

export default function PriceChart({ series }) {
  const data = series.map((d) => ({
    ...d,
    bbWidth: d.bbUpper !== null && d.bbLower !== null ? d.bbUpper - d.bbLower : null,
  }));

  return (
    <ResponsiveContainer width="100%" height={340}>
      <ComposedChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
        <CartesianGrid vertical={false} stroke="var(--grid)" />
        <XAxis
          dataKey="date"
          tickFormatter={fmtDate}
          tick={{ fill: "var(--text-muted)", fontSize: 11 }}
          axisLine={{ stroke: "var(--axis)" }}
          tickLine={false}
          minTickGap={40}
        />
        <YAxis
          domain={["auto", "auto"]}
          tick={{ fill: "var(--text-muted)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={56}
        />
        <Tooltip content={<PriceTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: 12, color: "var(--text-secondary)" }}
          formatter={(value) => <span style={{ color: "var(--text-secondary)" }}>{value}</span>}
        />

        <Area dataKey="bbLower" stackId="bb" stroke="none" fill="transparent" isAnimationActive={false} legendType="none" />
        <Area
          dataKey="bbWidth"
          stackId="bb"
          stroke="none"
          fill="var(--series-1)"
          fillOpacity={0.07}
          isAnimationActive={false}
          name="Bollinger band"
        />

        <Line type="monotone" dataKey="close" name="Close" stroke="var(--text-primary)" strokeWidth={2.5} dot={false} isAnimationActive={false} />
        <Line type="monotone" dataKey="sma20" name="SMA 20" stroke="var(--series-1)" strokeWidth={2} dot={false} isAnimationActive={false} />
        <Line type="monotone" dataKey="sma50" name="SMA 50" stroke="var(--series-2)" strokeWidth={2} dot={false} isAnimationActive={false} />
        <Line type="monotone" dataKey="sma200" name="SMA 200" stroke="var(--series-3)" strokeWidth={2} dot={false} isAnimationActive={false} />
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

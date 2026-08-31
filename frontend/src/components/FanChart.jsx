import { useMemo } from "react";
import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, ReferenceLine, Tooltip, Legend, ResponsiveContainer } from "recharts";

function fmtMoney(v) {
  return `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function FanTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div style={tooltipStyle}>
      <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 12 }}>Trading day {label}</div>
      <Row label="95th percentile" value={d.p95} color="var(--series-1)" />
      <Row label="75th percentile" value={d.p75} color="var(--series-1)" />
      <Row label="Median" value={d.p50} color="var(--text-primary)" />
      <Row label="25th percentile" value={d.p25} color="var(--series-8)" />
      <Row label="5th percentile" value={d.p5} color="var(--series-8)" />
    </div>
  );
}

function Row({ label, value, color }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 16, fontSize: 12 }}>
      <span style={{ color: "var(--text-secondary)" }}>
        <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: color, marginRight: 6 }} />
        {label}
      </span>
      <span style={{ fontVariantNumeric: "tabular-nums" }}>{fmtMoney(value)}</span>
    </div>
  );
}

export default function FanChart({ days, pathPercentiles, amount }) {
  const data = useMemo(
    () =>
      days.map((day, i) => {
        const p5 = pathPercentiles.p5[i] * amount;
        const p25 = pathPercentiles.p25[i] * amount;
        const p50 = pathPercentiles.p50[i] * amount;
        const p75 = pathPercentiles.p75[i] * amount;
        const p95 = pathPercentiles.p95[i] * amount;
        return { day, p5, p25, p50, p75, p95, band5095: p95 - p5, band2575: p75 - p25 };
      }),
    [days, pathPercentiles, amount]
  );

  return (
    <ResponsiveContainer width="100%" height={320}>
      <ComposedChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
        <CartesianGrid vertical={false} stroke="var(--grid)" />
        <XAxis
          dataKey="day"
          tickFormatter={(v) => `${v}d`}
          tick={{ fill: "var(--text-muted)", fontSize: 11 }}
          axisLine={{ stroke: "var(--axis)" }}
          tickLine={false}
        />
        <YAxis
          tickFormatter={fmtMoney}
          orientation="right"
          tick={{ fill: "var(--text-muted)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={64}
          domain={["auto", "auto"]}
        />
        <ReferenceLine y={amount} stroke="var(--axis)" strokeDasharray="3 3" />
        <Tooltip content={<FanTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: 12, color: "var(--text-secondary)" }}
          payload={[
            { value: "5th–95th percentile", type: "rect", color: "var(--series-1)" },
            { value: "25th–75th percentile", type: "rect", color: "var(--series-8)" },
            { value: "Median", type: "line", color: "var(--text-primary)" },
          ]}
        />

        <Area dataKey="p5" stackId="outer" stroke="none" fill="transparent" isAnimationActive={false} legendType="none" />
        <Area dataKey="band5095" stackId="outer" stroke="none" fill="var(--series-1)" fillOpacity={0.12} isAnimationActive={false} legendType="none" />

        <Area dataKey="p25" stackId="inner" stroke="none" fill="transparent" isAnimationActive={false} legendType="none" />
        <Area dataKey="band2575" stackId="inner" stroke="none" fill="var(--series-8)" fillOpacity={0.2} isAnimationActive={false} legendType="none" />

        <Line type="monotone" dataKey="p50" stroke="var(--text-primary)" strokeWidth={2.5} dot={false} isAnimationActive={false} legendType="none" />
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
  minWidth: 170,
};

import { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ReferenceLine, Tooltip, Legend, ResponsiveContainer } from "recharts";

function SeasonalityTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  const avg = payload.find((p) => p.dataKey === "seasonalAvg");
  const cur = payload.find((p) => p.dataKey === "currentYear");
  return (
    <div style={tooltipStyle}>
      <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 12 }}>{label}</div>
      {avg && avg.value !== null && avg.value !== undefined && (
        <Row color="var(--series-4)" label="Seasonal average" value={avg.value} />
      )}
      {cur && cur.value !== null && cur.value !== undefined && (
        <Row color="var(--series-1)" label="This year" value={cur.value} />
      )}
    </div>
  );
}

function Row({ color, label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 16, fontSize: 12 }}>
      <span style={{ color: "var(--text-secondary)" }}>
        <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: color, marginRight: 6 }} />
        {label}
      </span>
      <span style={{ fontVariantNumeric: "tabular-nums", color: value >= 0 ? "var(--delta-up)" : "var(--delta-down)" }}>
        {value >= 0 ? "+" : ""}
        {value.toFixed(2)}%
      </span>
    </div>
  );
}

export default function SeasonalityChart({ series, yearsCovered }) {
  // Thin out days with too few historical years to be meaningful noise vs. signal.
  const minSamples = Math.max(2, Math.floor(yearsCovered / 2));
  const data = useMemo(
    () =>
      series.map((d) => ({
        ...d,
        seasonalAvg: d.yearsSampled >= minSamples ? d.seasonalAvg : null,
      })),
    [series, minSamples]
  );

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
        <CartesianGrid vertical={false} stroke="var(--grid)" />
        <XAxis
          dataKey="label"
          tick={{ fill: "var(--text-muted)", fontSize: 11 }}
          axisLine={{ stroke: "var(--axis)" }}
          tickLine={false}
          minTickGap={48}
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
        <Tooltip content={<SeasonalityTooltip />} cursor={{ stroke: "var(--axis)", strokeWidth: 1 }} />
        <Legend
          wrapperStyle={{ fontSize: 12, color: "var(--text-secondary)" }}
          formatter={(value) => <span style={{ color: "var(--text-secondary)" }}>{value}</span>}
        />
        <Line type="monotone" dataKey="seasonalAvg" name={`${yearsCovered}-year average`} stroke="var(--series-4)" strokeWidth={2} dot={false} isAnimationActive={false} connectNulls />
        <Line type="monotone" dataKey="currentYear" name="This year" stroke="var(--series-1)" strokeWidth={2.5} dot={false} isAnimationActive={false} connectNulls />
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
  minWidth: 170,
};

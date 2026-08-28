import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ReferenceLine, Cell, ResponsiveContainer } from "recharts";

function buildHistogram(series, binCount = 21) {
  const returns = [];
  for (let i = 1; i < series.length; i++) {
    const prev = series[i - 1].close;
    const cur = series[i].close;
    if (prev !== null && prev !== undefined && cur !== null && cur !== undefined && prev !== 0) {
      returns.push((cur / prev - 1) * 100);
    }
  }
  if (returns.length === 0) return { bins: [], stats: null };

  const bound = Math.min(10, Math.max(1, Math.ceil(Math.max(...returns.map(Math.abs)) * 1.05)));
  const width = (2 * bound) / binCount;
  const bins = Array.from({ length: binCount }, (_, i) => {
    const lo = -bound + i * width;
    const hi = lo + width;
    return { lo, hi, mid: (lo + hi) / 2, count: 0 };
  });
  for (const r of returns) {
    const clamped = Math.max(-bound, Math.min(bound - 1e-9, r));
    const idx = Math.min(binCount - 1, Math.floor((clamped + bound) / width));
    bins[idx].count += 1;
  }

  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, b) => a + (b - mean) ** 2, 0) / returns.length;
  const stats = { mean, std: Math.sqrt(variance), n: returns.length };

  return { bins, stats };
}

function HistTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;
  return (
    <div style={tooltipStyle}>
      <div style={{ fontSize: 12 }}>
        {d.lo.toFixed(1)}% to {d.hi.toFixed(1)}%: <strong>{d.count}</strong> day{d.count === 1 ? "" : "s"}
      </div>
    </div>
  );
}

export default function ReturnsHistogram({ series }) {
  const { bins, stats } = useMemo(() => buildHistogram(series), [series]);

  if (!stats) {
    return <div style={{ color: "var(--text-muted)", fontSize: 13 }}>Not enough data to compute a return distribution.</div>;
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={140}>
        <BarChart data={bins} margin={{ top: 8, right: 12, left: 4, bottom: 0 }} barCategoryGap={1}>
          <XAxis dataKey="mid" tickFormatter={(v) => `${v.toFixed(0)}%`} tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={{ stroke: "var(--axis)" }} tickLine={false} />
          <YAxis tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} width={30} allowDecimals={false} />
          <ReferenceLine x={0} stroke="var(--axis)" />
          <Tooltip content={<HistTooltip />} cursor={{ fill: "var(--grid)", opacity: 0.4 }} />
          <Bar dataKey="count" isAnimationActive={false}>
            {bins.map((b, i) => (
              <Cell key={i} fill={b.mid >= 0 ? "var(--delta-up)" : "var(--delta-down)"} fillOpacity={0.6} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
        Daily returns over this range: mean {stats.mean >= 0 ? "+" : ""}
        {stats.mean.toFixed(2)}%, std dev {stats.std.toFixed(2)}%, {stats.n} trading days.
      </div>
    </div>
  );
}

const tooltipStyle = {
  background: "var(--surface-2)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  padding: "6px 10px",
  boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
};

import { useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

function fmtDate(d) {
  return d?.slice(5);
}

function DrawdownTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={tooltipStyle}>
      <div style={{ fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 12, color: "var(--delta-down)" }}>{payload[0].value.toFixed(2)}% from peak</div>
    </div>
  );
}

export default function DrawdownChart({ series }) {
  const data = useMemo(() => {
    let peak = null;
    return series.map((d) => {
      if (d.close !== null && d.close !== undefined) {
        peak = peak === null ? d.close : Math.max(peak, d.close);
      }
      const drawdown = peak && d.close !== null && d.close !== undefined ? (d.close / peak - 1) * 100 : null;
      return { date: d.date, drawdown };
    });
  }, [series]);

  const maxDrawdown = useMemo(() => Math.min(0, ...data.map((d) => d.drawdown ?? 0)), [data]);

  return (
    <div>
      <ResponsiveContainer width="100%" height={110}>
        <AreaChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
          <defs>
            <linearGradient id="ddFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--delta-down)" stopOpacity={0} />
              <stop offset="95%" stopColor="var(--delta-down)" stopOpacity={0.25} />
            </linearGradient>
          </defs>
          <XAxis dataKey="date" tickFormatter={fmtDate} hide />
          <YAxis
            tickFormatter={(v) => `${v}%`}
            tick={{ fill: "var(--text-muted)", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={40}
            domain={[Math.floor(maxDrawdown / 5) * 5, 0]}
          />
          <Tooltip content={<DrawdownTooltip />} />
          <Area
            type="monotone"
            dataKey="drawdown"
            name="Drawdown"
            stroke="var(--delta-down)"
            strokeWidth={2}
            fill="url(#ddFill)"
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
        Max drawdown over this range: <strong style={{ color: "var(--delta-down)" }}>{maxDrawdown.toFixed(1)}%</strong>
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

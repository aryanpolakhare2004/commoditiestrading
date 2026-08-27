import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

function fmtDate(d) {
  return d?.slice(5);
}

function fmtVolume(v) {
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
  return v;
}

function VolTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={tooltipStyle}>
      <div style={{ fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>Volume {fmtVolume(payload[0].value)}</div>
    </div>
  );
}

export default function VolumeChart({ series }) {
  return (
    <ResponsiveContainer width="100%" height={90}>
      <BarChart data={series} margin={{ top: 4, right: 12, left: 4, bottom: 0 }}>
        <XAxis dataKey="date" tickFormatter={fmtDate} hide />
        <YAxis tickFormatter={fmtVolume} tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} width={40} />
        <Tooltip content={<VolTooltip />} cursor={{ fill: "var(--grid)", opacity: 0.4 }} />
        <Bar dataKey="volume" fill="var(--text-muted)" fillOpacity={0.5} isAnimationActive={false} maxBarSize={6} />
      </BarChart>
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

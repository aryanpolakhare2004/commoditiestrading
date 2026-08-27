import { useMemo, useState } from "react";
import { AreaChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const INDICATORS = [
  { key: "sma20", label: "SMA 20", color: "var(--series-1)" },
  { key: "sma50", label: "SMA 50", color: "var(--series-2)" },
  { key: "sma200", label: "SMA 200", color: "var(--series-3)" },
  { key: "bb", label: "Bollinger Bands", color: "var(--series-7)" },
];

function fmtDate(d) {
  return d?.slice(5);
}

function ChartTooltip({ active, payload, label, showIndicators }) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;
  return (
    <div style={tooltipStyle}>
      <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 12 }}>{label}</div>
      <Row color="var(--text-primary)" label="Close" value={d.close} />
      {showIndicators.has("sma20") && <Row color="var(--series-1)" label="SMA 20" value={d.sma20} />}
      {showIndicators.has("sma50") && <Row color="var(--series-2)" label="SMA 50" value={d.sma50} />}
      {showIndicators.has("sma200") && <Row color="var(--series-3)" label="SMA 200" value={d.sma200} />}
      {showIndicators.has("bb") && <Row color="var(--series-7)" label="Upper band" value={d.bbUpper} />}
      {showIndicators.has("bb") && <Row color="var(--series-7)" label="Lower band" value={d.bbLower} />}
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

export default function PriceChart({ series, positive, onHover }) {
  const [active, setActive] = useState(() => new Set());

  const data = useMemo(
    () =>
      series.map((d) => ({
        ...d,
        bbWidth: d.bbUpper !== null && d.bbLower !== null ? d.bbUpper - d.bbLower : null,
      })),
    [series]
  );

  const toggle = (key) => {
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const color = positive ? "var(--delta-up)" : "var(--delta-down)";
  const gradientId = positive ? "priceFillUp" : "priceFillDown";

  const handleMove = (state) => {
    if (state && state.activePayload && state.activePayload.length) {
      onHover?.(state.activePayload[0].payload);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
        {INDICATORS.map((ind) => (
          <button
            key={ind.key}
            onClick={() => toggle(ind.key)}
            style={{
              ...pillStyle,
              borderColor: active.has(ind.key) ? ind.color : "var(--border)",
              color: active.has(ind.key) ? ind.color : "var(--text-secondary)",
              background: active.has(ind.key) ? `color-mix(in oklab, ${ind.color} 12%, transparent)` : "transparent",
            }}
          >
            {ind.label}
          </button>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={360}>
        <AreaChart data={data} onMouseMove={handleMove} onMouseLeave={() => onHover?.(null)} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.28} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
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
            domain={["auto", "auto"]}
            orientation="right"
            tick={{ fill: "var(--text-muted)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={54}
          />
          <Tooltip content={<ChartTooltip showIndicators={active} />} cursor={{ stroke: "var(--axis)", strokeWidth: 1 }} />

          {active.has("bb") && (
            <>
              <Area dataKey="bbLower" stackId="bb" stroke="none" fill="transparent" isAnimationActive={false} />
              <Area dataKey="bbWidth" stackId="bb" stroke="none" fill="var(--series-7)" fillOpacity={0.08} isAnimationActive={false} />
            </>
          )}

          <Area
            type="monotone"
            dataKey="close"
            stroke={color}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            dot={false}
            isAnimationActive={false}
          />

          {active.has("sma20") && <Line type="monotone" dataKey="sma20" stroke="var(--series-1)" strokeWidth={1.5} dot={false} isAnimationActive={false} />}
          {active.has("sma50") && <Line type="monotone" dataKey="sma50" stroke="var(--series-2)" strokeWidth={1.5} dot={false} isAnimationActive={false} />}
          {active.has("sma200") && <Line type="monotone" dataKey="sma200" stroke="var(--series-3)" strokeWidth={1.5} dot={false} isAnimationActive={false} />}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

const tooltipStyle = {
  background: "var(--surface-2)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  padding: "8px 10px",
  boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
  minWidth: 150,
};

const pillStyle = {
  border: "1px solid var(--border)",
  borderRadius: 999,
  padding: "3px 11px",
  fontSize: 11.5,
  fontWeight: 500,
  cursor: "pointer",
};

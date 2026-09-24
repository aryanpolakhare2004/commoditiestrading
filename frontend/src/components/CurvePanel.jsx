import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { api } from "../api.js";
import { structureColor } from "../curveStyle.js";

const STRUCTURE_TEXT = {
  backwardation:
    "Later contracts are cheaper than the front — usually a sign of tight nearby supply. A long position rolling forward earns this carry; a short pays it.",
  contango:
    "Later contracts are dearer than the front — usually ample supply or storage cost priced in. A long position rolling forward pays this carry; a short earns it.",
  flat: "The curve is roughly flat — carry is not a meaningful factor for either side right now.",
};

function CurveTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const p = payload[0].payload;
  return (
    <div style={tooltipStyle}>
      <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 2 }}>{p.label}</div>
      <div style={{ fontSize: 12, fontVariantNumeric: "tabular-nums" }}>
        {p.price.toLocaleString(undefined, { maximumFractionDigits: 4 })}
      </div>
      {p.volume !== null && p.volume !== undefined && (
        <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>Volume {p.volume.toLocaleString()}</div>
      )}
    </div>
  );
}

export default function CurvePanel({ symbol }) {
  const [curve, setCurve] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api
      .curve(symbol)
      .then((d) => !cancelled && (setCurve(d), setError(null)))
      .catch((e) => !cancelled && (setCurve(null), setError(e.message)));
    return () => {
      cancelled = true;
    };
  }, [symbol]);

  if (error) return <div style={{ color: "var(--text-muted)", fontSize: 12.5 }}>No futures curve available for this market right now.</div>;
  if (!curve) return <div style={{ color: "var(--text-muted)", fontSize: 12.5 }}>Loading futures curve…</div>;

  const carry = curve.carryAnnualPct;
  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, flexWrap: "wrap", marginBottom: 6 }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: structureColor(curve.structure), textTransform: "capitalize" }}>
          {curve.structure || "—"}
        </span>
        {carry !== null && (
          <span style={{ fontSize: 12.5, color: "var(--text-secondary)" }}>
            Carry{" "}
            <strong style={{ color: structureColor(curve.structure), fontVariantNumeric: "tabular-nums" }}>
              {carry >= 0 ? "+" : ""}
              {carry.toFixed(1)}%/yr
            </strong>{" "}
            for a long, over {curve.spanMonths} months of curve
          </span>
        )}
      </div>
      <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12, lineHeight: 1.5 }}>
        {STRUCTURE_TEXT[curve.structure]}
        {curve.seasonal &&
          " This market's curve has a strong seasonal shape, so part of the slope reflects the calendar rather than today's supply balance."}
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={curve.points} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
          <CartesianGrid vertical={false} stroke="var(--grid)" />
          <XAxis dataKey="label" padding={{ left: 20, right: 20 }} interval={0} tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={{ stroke: "var(--axis)" }} tickLine={false} />
          <YAxis
            domain={["auto", "auto"]}
            orientation="right"
            tick={{ fill: "var(--text-muted)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={64}
            tickFormatter={(v) => v.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          />
          <Tooltip content={<CurveTooltip />} cursor={{ stroke: "var(--axis)", strokeWidth: 1 }} />
          <Line
            type="linear"
            dataKey="price"
            stroke="var(--series-1)"
            strokeWidth={2}
            dot={{ r: 4, fill: "var(--series-1)", stroke: "var(--surface-1)", strokeWidth: 2 }}
            activeDot={{ r: 6 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, marginTop: 10 }}>
        <thead>
          <tr style={{ color: "var(--text-muted)", textAlign: "right" }}>
            <th style={{ textAlign: "left", fontWeight: 500, padding: "4px 0" }}>Contract</th>
            <th style={{ fontWeight: 500 }}>Price</th>
            <th style={{ fontWeight: 500 }}>vs front</th>
            <th style={{ fontWeight: 500 }}>Volume</th>
          </tr>
        </thead>
        <tbody>
          {curve.points.map((p) => {
            const vsFront = (p.price / curve.points[0].price - 1) * 100;
            return (
              <tr key={p.ticker} style={{ borderTop: "1px solid var(--border)", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                <td style={{ textAlign: "left", padding: "4px 0" }}>
                  {p.label} <span style={{ color: "var(--text-muted)" }}>{p.ticker}</span>
                </td>
                <td>{p.price.toLocaleString(undefined, { maximumFractionDigits: 4 })}</td>
                <td style={{ color: "var(--text-secondary)" }}>
                  {vsFront >= 0 ? "+" : ""}
                  {vsFront.toFixed(2)}%
                </td>
                <td style={{ color: "var(--text-secondary)" }}>{p.volume === null ? "—" : p.volume.toLocaleString()}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8 }}>
        Last settlements of individual contract months from Yahoo Finance, as of {curve.points[0]?.date}. Expired, stale,
        and thin front months in their final weeks are dropped.
      </div>
    </div>
  );
}

const tooltipStyle = {
  background: "var(--surface-2)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  padding: "8px 10px",
  boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
};

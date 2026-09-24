import { useEffect, useMemo, useState } from "react";
import { api } from "../api.js";
import Sparkline from "./Sparkline.jsx";
import { structureColor } from "../curveStyle.js";

function signed(v, digits = 2, suffix = "") {
  if (v === null || v === undefined) return "—";
  return `${v >= 0 ? "+" : ""}${v.toFixed(digits)}${suffix}`;
}

function DriverTile({ d }) {
  if (!d.available) {
    return (
      <div style={tileStyle}>
        <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{d.name}</div>
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}>Unavailable</div>
      </div>
    );
  }
  const up = (d.change1m ?? 0) >= 0;
  return (
    <div style={tileStyle}>
      <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{d.name}</div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 8 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
            {d.last.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            {d.unit === "%" ? "%" : ""}
          </div>
          <div style={{ fontSize: 11.5, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>
            1D {signed(d.change1d, 2, "%")} · 1M{" "}
            {d.change1mBp !== undefined ? `${d.change1mBp >= 0 ? "+" : ""}${d.change1mBp}bp` : signed(d.change1m, 2, "%")}
          </div>
        </div>
        <Sparkline values={d.sparkline} width={90} height={30} positive={up} />
      </div>
      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
        {d.percentile1y}th percentile of its 1-year range
      </div>
    </div>
  );
}

// Diverging tint for a correlation cell: blue-ish/up for positive, red/down for negative,
// strength by magnitude. The number is always printed, so color is never the only cue.
function corrCellStyle(v) {
  if (v === null || v === undefined) return { color: "var(--text-muted)" };
  const pct = Math.round(Math.min(Math.abs(v), 1) * 45);
  const hue = v >= 0 ? "var(--delta-up)" : "var(--delta-down)";
  return { background: `color-mix(in srgb, ${hue} ${pct}%, transparent)` };
}

const COLUMNS = [
  { key: "name", label: "Commodity", align: "left" },
  { key: "carryAnnualPct", label: "Curve carry", title: "Annualized carry for a long position (positive = backwardation)" },
  { key: "dollar", label: "vs Dollar", title: "6-month correlation of daily returns with the US Dollar Index" },
  { key: "dollarImpact1m", label: "Dollar effect 1M", title: "Dollar's past-month move × this commodity's dollar beta" },
  { key: "spx", label: "vs S&P 500", title: "6-month correlation with S&P 500 daily returns" },
  { key: "yield10y", label: "vs 10Y yield", title: "6-month correlation with daily changes in the 10-year yield" },
  { key: "vix", label: "vs VIX", title: "6-month correlation with daily VIX changes" },
];

export default function MacroView({ onSelect }) {
  const [macro, setMacro] = useState(null);
  const [curves, setCurves] = useState(null);
  const [error, setError] = useState(null);
  const [sort, setSort] = useState({ key: "dollar", dir: 1 });

  useEffect(() => {
    api.macro().then(setMacro).catch((e) => setError(e.message));
    api
      .curves()
      .then((d) => setCurves(Object.fromEntries(d.curves.map((c) => [c.symbol, c]))))
      .catch(() => setCurves({}));
  }, []);

  const rows = useMemo(() => {
    if (!macro) return [];
    const merged = macro.sensitivities.map((s) => ({
      ...s,
      structure: curves?.[s.symbol]?.structure ?? null,
      carryAnnualPct: curves?.[s.symbol]?.carryAnnualPct ?? null,
      seasonal: curves?.[s.symbol]?.seasonal ?? false,
    }));
    return merged.sort((a, b) => {
      const av = a[sort.key];
      const bv = b[sort.key];
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      if (typeof av === "string") return av.localeCompare(bv) * sort.dir;
      return (av - bv) * sort.dir;
    });
  }, [macro, curves, sort]);

  function toggleSort(key) {
    setSort((s) => (s.key === key ? { key, dir: -s.dir } : { key, dir: key === "name" ? 1 : -1 }));
  }

  if (error) return <div style={{ color: "var(--critical)" }}>{error}</div>;
  if (!macro) return <div style={{ color: "var(--text-muted)" }}>Loading macro drivers…</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={panelStyle}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Macro Drivers</div>
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 14 }}>
          The cross-asset backdrop commodities trade against. A strong dollar weighs on dollar-priced metals; rising
          yields raise the cost of holding non-yielding assets; equities and the VIX track risk appetite.
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
          {macro.drivers.map((d) => (
            <DriverTile key={d.key} d={d} />
          ))}
        </div>
      </div>

      <div style={panelStyle}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Sensitivity & Carry</div>
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 14, lineHeight: 1.5 }}>
          Correlations are trailing 6-month statistics of daily moves — co-movement, not cause, and they drift. "Dollar
          effect 1M" is what the dollar's own past-month move implies for each commodity through its dollar beta.
          Curve carry is from individual contract months (see a commodity's Curve tab);{" "}
          <span style={{ color: "var(--text-secondary)" }}>*</span> marks strongly seasonal curves. Click a column to
          sort, a row to open it.
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, minWidth: 640 }}>
            <thead>
              <tr>
                {COLUMNS.map((c) => (
                  <th
                    key={c.key}
                    title={c.title}
                    onClick={() => toggleSort(c.key)}
                    style={{
                      textAlign: c.align || "right",
                      fontWeight: 500,
                      color: sort.key === c.key ? "var(--text-primary)" : "var(--text-muted)",
                      padding: "6px 8px",
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      userSelect: "none",
                    }}
                  >
                    {c.label}
                    {sort.key === c.key ? (sort.dir === 1 ? " ▲" : " ▼") : ""}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.symbol}
                  onClick={() => onSelect(r.symbol)}
                  style={{ borderTop: "1px solid var(--border)", cursor: "pointer", fontVariantNumeric: "tabular-nums" }}
                >
                  <td style={{ padding: "6px 8px" }}>
                    <span style={{ fontWeight: 600 }}>{r.name}</span>{" "}
                    <span style={{ color: "var(--text-muted)", fontSize: 11.5 }}>{r.sector}</span>
                  </td>
                  <td style={{ textAlign: "right", padding: "6px 8px", color: structureColor(r.structure) }}>
                    {r.carryAnnualPct === null ? "—" : `${signed(r.carryAnnualPct, 1, "%")}`}
                    {r.seasonal ? "*" : ""}
                  </td>
                  <td style={{ textAlign: "right", padding: "6px 8px", ...corrCellStyle(r.dollar) }}>{signed(r.dollar)}</td>
                  <td style={{ textAlign: "right", padding: "6px 8px", color: "var(--text-secondary)" }}>
                    {signed(r.dollarImpact1m, 2, "%")}
                  </td>
                  <td style={{ textAlign: "right", padding: "6px 8px", ...corrCellStyle(r.spx) }}>{signed(r.spx)}</td>
                  <td style={{ textAlign: "right", padding: "6px 8px", ...corrCellStyle(r.yield10y) }}>{signed(r.yield10y)}</td>
                  <td style={{ textAlign: "right", padding: "6px 8px", ...corrCellStyle(r.vix) }}>{signed(r.vix)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const panelStyle = {
  background: "var(--surface-1)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: 16,
};

const tileStyle = {
  background: "var(--surface-2)",
  border: "1px solid var(--border)",
  borderRadius: 10,
  padding: 12,
};

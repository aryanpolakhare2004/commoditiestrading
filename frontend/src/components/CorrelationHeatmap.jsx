import { Fragment, useMemo, useState } from "react";

// Diverging blue<->red, neutral gray midpoint at 0, matching the app's diverging pair.
function colorForValue(v) {
  if (v === null || v === undefined) return "var(--grid)";
  const t = Math.max(-1, Math.min(1, v));
  if (t >= 0) {
    return mix("var(--div-mid)", "var(--div-pos)", t);
  }
  return mix("var(--div-mid)", "var(--div-neg)", -t);
}

// Blend via CSS color-mix so it follows the live theme tokens.
function mix(a, b, t) {
  const pct = Math.round(t * 100);
  return `color-mix(in oklab, ${b} ${pct}%, ${a})`;
}

export default function CorrelationHeatmap({ symbols, matrix, nameFor }) {
  const [hover, setHover] = useState(null);
  const lookup = useMemo(() => {
    const m = new Map();
    matrix.forEach((cell) => m.set(`${cell.x}|${cell.y}`, cell.value));
    return m;
  }, [matrix]);

  const short = (s) => s.replace("=F", "");
  const cellSize = 34;

  return (
    <div style={{ overflowX: "auto" }}>
      <div style={{ display: "inline-block", position: "relative" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `120px repeat(${symbols.length}, ${cellSize}px)`,
            gridAutoRows: cellSize,
          }}
        >
          <div />
          {symbols.map((s) => (
            <div
              key={`col-${s}`}
              style={{
                writingMode: "vertical-rl",
                transform: "rotate(180deg)",
                fontSize: 11,
                color: "var(--text-muted)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {short(s)}
            </div>
          ))}
          {symbols.map((rowSym) => (
            <Fragment key={rowSym}>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--text-muted)",
                  display: "flex",
                  alignItems: "center",
                  paddingRight: 8,
                  justifyContent: "flex-end",
                }}
              >
                {nameFor ? nameFor(rowSym) : short(rowSym)}
              </div>
              {symbols.map((colSym) => {
                const v = lookup.get(`${rowSym}|${colSym}`);
                return (
                  <div
                    key={colSym}
                    onMouseEnter={() => setHover({ rowSym, colSym, v })}
                    onMouseLeave={() => setHover(null)}
                    style={{
                      background: colorForValue(v),
                      border: "2px solid var(--surface-1)",
                      cursor: "default",
                    }}
                    title={`${short(rowSym)} vs ${short(colSym)}: ${v === null || v === undefined ? "n/a" : v.toFixed(2)}`}
                  />
                );
              })}
            </Fragment>
          ))}
        </div>

        {hover && (
          <div
            style={{
              position: "absolute",
              bottom: -36,
              left: 0,
              fontSize: 12,
              color: "var(--text-secondary)",
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              borderRadius: 6,
              padding: "4px 8px",
              whiteSpace: "nowrap",
            }}
          >
            <strong>{short(hover.rowSym)}</strong> vs <strong>{short(hover.colSym)}</strong>:{" "}
            {hover.v === null || hover.v === undefined ? "n/a" : hover.v.toFixed(3)}
          </div>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 44, fontSize: 11, color: "var(--text-muted)" }}>
        <span>-1</span>
        <div
          style={{
            width: 160,
            height: 10,
            borderRadius: 5,
            background: `linear-gradient(90deg, var(--div-neg), var(--div-mid), var(--div-pos))`,
          }}
        />
        <span>+1</span>
        <span style={{ marginLeft: 8 }}>Correlation of daily returns</span>
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { api } from "../api.js";
import EventsFeed from "./EventsFeed.jsx";

function buildThesis(e) {
  const dirWord = e.direction === "bullish" ? "bullish" : "bearish";
  const parts = [];

  parts.push(
    `${e.name} is currently showing a ${dirWord} technical setup (score ${e.currentScore}).`
  );

  if (e.ev.sampleSize > 0) {
    parts.push(
      `Historically, ${dirWord} setups like this one on ${e.name} were followed by a positive ${e.ev.forwardDays}-trading-day return ${e.ev.winProbability}% of the time (n=${e.ev.sampleSize}), averaging +${e.ev.upside}% on the wins vs ${e.ev.downside}% on the losses — an expected value of ${e.ev.expectedValue >= 0 ? "+" : ""}${e.ev.expectedValue}%.`
    );
  } else {
    parts.push("Not enough historical instances of this setup on this instrument to estimate an edge.");
  }

  if (e.recentEvents.length > 0) {
    parts.push(`Recently: ${e.recentEvents.map((ev) => ev.description.toLowerCase()).join("; ")}.`);
  }

  const exposureNames = [
    ...e.relatedComplex,
    ...e.relatedByCorrelation.map((r) => r.symbol),
  ];
  if (exposureNames.length > 0) {
    const unique = [...new Set(exposureNames)].slice(0, 4).map((s) => s.replace("=F", ""));
    parts.push(`Related exposure: ${unique.join(", ")}.`);
  }

  return parts.join(" ");
}

const COMPONENT_LABELS = {
  momentum: "Momentum",
  trend: "Trend (vs 200DMA)",
  positioning: "CFTC Positioning",
  volatility: "Volatility",
  sentiment: "News Sentiment",
};

function SignalBar({ label, value }) {
  if (value === null || value === undefined) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11.5 }}>
        <span style={{ width: 130, color: "var(--text-muted)" }}>{label}</span>
        <span style={{ color: "var(--text-muted)" }}>no data</span>
      </div>
    );
  }
  const clamped = Math.max(-3, Math.min(3, value));
  const pct = (Math.abs(clamped) / 3) * 50;
  const positive = value >= 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11.5 }}>
      <span style={{ width: 130, color: "var(--text-secondary)", flexShrink: 0 }}>{label}</span>
      <div style={{ position: "relative", flex: 1, height: 8, background: "var(--grid)", borderRadius: 4 }}>
        <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 1, background: "var(--axis)" }} />
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            width: `${pct}%`,
            left: positive ? "50%" : `${50 - pct}%`,
            background: positive ? "var(--delta-up)" : "var(--delta-down)",
            borderRadius: 4,
          }}
        />
      </div>
      <span style={{ width: 40, textAlign: "right", fontVariantNumeric: "tabular-nums", color: positive ? "var(--delta-up)" : "var(--delta-down)" }}>
        {value >= 0 ? "+" : ""}
        {value.toFixed(2)}
      </span>
    </div>
  );
}

function OpportunityCard({ rank, e, expanded, onToggle }) {
  const dirColor = e.direction === "bullish" ? "var(--good)" : "var(--critical)";
  return (
    <div style={cardStyle}>
      <button onClick={onToggle} style={headerButtonStyle}>
        <span style={{ fontSize: 13, color: "var(--text-muted)", width: 24, flexShrink: 0 }}>#{rank}</span>
        <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 600, fontSize: 14 }}>{e.name}</span>
            <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
              {e.symbol.replace("=F", "")} · {e.sector}
            </span>
            <span style={{ fontSize: 11.5, fontWeight: 600, color: dirColor }}>{e.direction === "bullish" ? "▲ Bullish setup" : "▼ Bearish setup"}</span>
          </div>
          {e.ev.sampleSize > 0 && (
            <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 2 }}>
              Win {e.ev.winProbability}% · EV {e.ev.expectedValue >= 0 ? "+" : ""}
              {e.ev.expectedValue}% · n={e.ev.sampleSize}
            </div>
          )}
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Opportunity score</div>
          <div style={{ fontSize: 20, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
            {e.opportunityScore === null ? "—" : e.opportunityScore}
          </div>
        </div>
      </button>

      {expanded && (
        <div style={{ padding: "0 16px 16px", borderTop: "1px solid var(--border)", marginTop: 4, paddingTop: 12 }}>
          <p style={{ fontSize: 12.5, color: "var(--text-secondary)", lineHeight: 1.6, margin: "0 0 14px" }}>{buildThesis(e)}</p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
            <div>
              <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 8 }}>
                Signal components (z-scores)
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {Object.entries(e.signals.components).map(([key, value]) => (
                  <SignalBar key={key} label={COMPONENT_LABELS[key] || key} value={value} />
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 8 }}>
                Score adjustments
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
                <Row label="Confidence (sample size)" value={e.adjustments.confidence} />
                <Row label="Volatility penalty" value={e.adjustments.volatilityPenalty} />
                <Row label="Liquidity penalty" value={e.adjustments.liquidityPenalty} />
              </div>

              {(e.relatedComplex.length > 0 || e.relatedByCorrelation.length > 0) && (
                <>
                  <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--text-secondary)", margin: "14px 0 8px" }}>
                    Related exposure
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {e.relatedComplex.map((s) => (
                      <span key={s} style={chipStyle}>
                        {s.replace("=F", "")} · same complex
                      </span>
                    ))}
                    {e.relatedByCorrelation.map((r) => (
                      <span key={r.symbol} style={chipStyle}>
                        {r.symbol.replace("=F", "")} · r={r.correlation}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <span style={{ color: "var(--text-muted)" }}>{label}</span>
      <span style={{ color: value >= 0 ? "var(--delta-up)" : "var(--delta-down)", fontWeight: 600 }}>
        {value >= 0 ? "+" : ""}
        {value}
      </span>
    </div>
  );
}

export default function ResearchPanel({ allCommodities, onSelect }) {
  const [data, setData] = useState(null);
  const [eventsData, setEventsData] = useState(null);
  const [error, setError] = useState(null);
  const [expandedSymbol, setExpandedSymbol] = useState(null);

  useEffect(() => {
    api.opportunities().then(setData).catch((e) => setError(e.message));
    api.events(14).then(setEventsData).catch(() => setEventsData({ events: [] }));
  }, []);

  const nameBySymbol = useMemo(
    () => Object.fromEntries(allCommodities.map((c) => [c.symbol, c.name])),
    [allCommodities]
  );

  return (
    <div>
      <div
        style={{
          fontSize: 11.5,
          color: "var(--text-muted)",
          background: "var(--surface-1)",
          border: "1px solid var(--border)",
          borderRadius: 8,
          padding: "8px 12px",
          marginBottom: 20,
        }}
      >
        Pipeline: signals → event detection → asset mapping → EV scoring → backtest, all deterministic Python — no
        language model is involved yet (that's a documented future step for news-based event extraction and thesis
        writing; see the README). Opportunity score = expected value from this instrument's own backtested history,
        adjusted for sample-size confidence, elevated volatility, and liquidity. Not a forecast.
      </div>

      <div style={panelStyle}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>What Changed (last 14 days)</div>
        {eventsData ? (
          <EventsFeed events={eventsData.events} nameBySymbol={nameBySymbol} onSelect={onSelect} />
        ) : (
          <div style={{ color: "var(--text-muted)", fontSize: 13 }}>Loading events…</div>
        )}
      </div>

      <div style={{ fontSize: 14, fontWeight: 600, margin: "24px 0 10px" }}>Ranked Opportunities</div>

      {error && <div style={{ color: "var(--critical)" }}>{error}</div>}
      {!data && !error && (
        <div style={{ color: "var(--text-muted)" }}>
          Running the full pipeline across all commodities — positioning data, signals, events, and backtests. Can
          take up to a minute on a cold cache, then it's fast.
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {data?.entries.map((e, i) => (
          <OpportunityCard
            key={e.symbol}
            rank={i + 1}
            e={e}
            expanded={expandedSymbol === e.symbol}
            onToggle={() => setExpandedSymbol((prev) => (prev === e.symbol ? null : e.symbol))}
          />
        ))}
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

const cardStyle = {
  background: "var(--surface-1)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  overflow: "hidden",
};

const headerButtonStyle = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  width: "100%",
  padding: "12px 16px",
  border: "none",
  background: "none",
  cursor: "pointer",
  color: "inherit",
  font: "inherit",
};

const chipStyle = {
  fontSize: 11,
  color: "var(--text-secondary)",
  border: "1px solid var(--border)",
  borderRadius: 999,
  padding: "3px 9px",
};

import { useEffect, useMemo, useState } from "react";
import { api } from "../api.js";
import { isAlertTriggered } from "../storage.js";
import Delta from "./Delta.jsx";
import SignalBadge from "./SignalBadge.jsx";

const DIRECTION_STYLE = {
  bullish: { color: "var(--good)", icon: "▲" },
  bearish: { color: "var(--critical)", icon: "▼" },
  risk: { color: "var(--warning)", icon: "◆" },
};

function MoverRow({ c, onSelect }) {
  return (
    <button onClick={() => onSelect(c.symbol)} style={moverRowStyle}>
      <span style={{ fontSize: 12.5, fontWeight: 600 }}>{c.name}</span>
      <Delta value={c.change1d} />
    </button>
  );
}

export default function DailyBrief({ overview, allCommodities, alerts, onSelect }) {
  const [events, setEvents] = useState(null);
  const [opportunities, setOpportunities] = useState(null);
  const [oppError, setOppError] = useState(null);

  useEffect(() => {
    api.events(2).then(setEvents).catch(() => setEvents({ events: [] }));
  }, []);

  useEffect(() => {
    api.opportunities().then(setOpportunities).catch((e) => setOppError(e.message));
  }, []);

  const nameBySymbol = useMemo(() => Object.fromEntries(allCommodities.map((c) => [c.symbol, c.name])), [allCommodities]);

  const { gainers, losers } = useMemo(() => {
    if (!overview) return { gainers: [], losers: [] };
    const available = overview.commodities.filter((c) => c.available && c.change1d !== null && c.change1d !== undefined);
    const sorted = [...available].sort((a, b) => b.change1d - a.change1d);
    return { gainers: sorted.slice(0, 3), losers: sorted.slice(-3).reverse() };
  }, [overview]);

  const triggeredAlerts = useMemo(() => {
    if (!overview) return [];
    const bySymbol = new Map(overview.commodities.map((c) => [c.symbol, c]));
    return alerts
      .map((a) => ({ alert: a, commodity: bySymbol.get(a.symbol) }))
      .filter(({ alert, commodity }) => isAlertTriggered(alert, commodity));
  }, [alerts, overview]);

  const now = new Date();

  return (
    <div>
      <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 20 }}>
        As of {now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })},{" "}
        {now.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
        <div style={panelStyle}>
          <div style={sectionTitleStyle}>Today's Movers</div>
          {overview ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {gainers.map((c) => (
                <MoverRow key={c.symbol} c={c} onSelect={onSelect} />
              ))}
              <div style={{ borderTop: "1px solid var(--border)", margin: "4px 0" }} />
              {losers.map((c) => (
                <MoverRow key={c.symbol} c={c} onSelect={onSelect} />
              ))}
            </div>
          ) : (
            <div style={{ color: "var(--text-muted)", fontSize: 13 }}>Loading…</div>
          )}
        </div>

        <div style={panelStyle}>
          <div style={sectionTitleStyle}>What Changed (48h)</div>
          {events ? (
            events.events.length === 0 ? (
              <div style={{ color: "var(--text-muted)", fontSize: 13 }}>No material changes detected.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {events.events.slice(0, 6).map((e, i) => {
                  const style = DIRECTION_STYLE[e.direction] || DIRECTION_STYLE.risk;
                  return (
                    <button key={i} onClick={() => onSelect(e.symbol)} style={eventRowStyle}>
                      <span style={{ color: style.color, fontSize: 11, flexShrink: 0 }}>{style.icon}</span>
                      <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                        <strong>{nameBySymbol[e.symbol] || e.symbol}</strong>: {e.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            )
          ) : (
            <div style={{ color: "var(--text-muted)", fontSize: 13 }}>Loading…</div>
          )}
        </div>

        <div style={panelStyle}>
          <div style={sectionTitleStyle}>Your Alerts</div>
          {triggeredAlerts.length === 0 ? (
            <div style={{ color: "var(--text-muted)", fontSize: 13 }}>No alerts triggered right now.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {triggeredAlerts.map(({ alert, commodity }) => (
                <button key={alert.id} onClick={() => onSelect(alert.symbol)} style={eventRowStyle}>
                  <span style={{ color: "var(--critical)", fontSize: 11 }}>⚠</span>
                  <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                    <strong>{nameBySymbol[alert.symbol] || alert.symbol}</strong> now{" "}
                    {commodity?.last?.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={panelStyle}>
          <div style={sectionTitleStyle}>Top Opportunities</div>
          {oppError && <div style={{ color: "var(--critical)", fontSize: 12.5 }}>{oppError}</div>}
          {!opportunities && !oppError && <div style={{ color: "var(--text-muted)", fontSize: 13 }}>Running the research pipeline…</div>}
          {opportunities && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {opportunities.entries.slice(0, 4).map((e) => (
                <button key={e.symbol} onClick={() => onSelect(e.symbol)} style={oppRowStyle}>
                  <span style={{ fontSize: 12.5 }}>{e.name}</span>
                  <SignalBadge label={e.direction === "bullish" ? "Buy" : "Sell"} />
                </button>
              ))}
            </div>
          )}
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

const sectionTitleStyle = { fontSize: 13, fontWeight: 600, marginBottom: 10 };

const moverRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  border: "none",
  background: "none",
  padding: "4px 0",
  cursor: "pointer",
  color: "inherit",
  font: "inherit",
  width: "100%",
  textAlign: "left",
};

const eventRowStyle = {
  display: "flex",
  gap: 8,
  alignItems: "flex-start",
  border: "none",
  background: "none",
  padding: 0,
  cursor: "pointer",
  textAlign: "left",
  width: "100%",
};

const oppRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  border: "none",
  background: "none",
  padding: "4px 0",
  cursor: "pointer",
  color: "inherit",
  font: "inherit",
  width: "100%",
  textAlign: "left",
};

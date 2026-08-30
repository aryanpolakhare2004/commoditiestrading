import { useMemo, useState } from "react";
import { ALERT_TYPES, isAlertTriggered } from "../storage.js";

export default function AlertsPanel({ allCommodities, overview, alerts, onAdd, onRemove, notificationsEnabled, onEnableNotifications }) {
  const [symbol, setSymbol] = useState(allCommodities[0]?.symbol || "");
  const [type, setType] = useState("price_above");
  const [threshold, setThreshold] = useState("");

  const bySymbol = useMemo(() => {
    const m = new Map();
    (overview?.commodities || []).forEach((c) => m.set(c.symbol, c));
    return m;
  }, [overview]);

  const rows = useMemo(
    () =>
      alerts
        .map((a) => ({ alert: a, commodity: bySymbol.get(a.symbol) }))
        .sort((a, b) => Number(triggered(b)) - Number(triggered(a))),
    [alerts, bySymbol]
  );

  function triggered({ alert, commodity }) {
    return isAlertTriggered(alert, commodity);
  }

  function submit(e) {
    e.preventDefault();
    const value = parseFloat(threshold);
    if (!symbol || Number.isNaN(value)) return;
    onAdd({ symbol, type, threshold: value });
    setThreshold("");
  }

  const meta = (sym) => allCommodities.find((c) => c.symbol === sym);

  return (
    <div>
      <div style={panelStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Price Alerts</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 14, maxWidth: 480 }}>
              Checked against live data on every refresh (every 5 minutes) while this tab is open.
              {notificationsEnabled
                ? " Browser notifications are on — you'll get one the moment an alert first crosses its threshold."
                : " Enable browser notifications to get one the moment an alert first crosses its threshold, even in another tab."}
            </div>
          </div>
          {!notificationsEnabled && (
            <button onClick={onEnableNotifications} style={notifyButtonStyle}>
              🔔 Enable notifications
            </button>
          )}
        </div>

        <form onSubmit={submit} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 18 }}>
          <select value={symbol} onChange={(e) => setSymbol(e.target.value)} style={selectStyle}>
            {allCommodities.map((c) => (
              <option key={c.symbol} value={c.symbol}>
                {c.name}
              </option>
            ))}
          </select>
          <select value={type} onChange={(e) => setType(e.target.value)} style={selectStyle}>
            {Object.entries(ALERT_TYPES).map(([key, def]) => (
              <option key={key} value={key}>
                {def.label}
              </option>
            ))}
          </select>
          <input
            type="number"
            step="any"
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            placeholder={type.startsWith("price") ? "Price" : "% change"}
            style={inputStyle}
            required
          />
          <button type="submit" style={addButtonStyle}>
            Add alert
          </button>
        </form>

        {rows.length === 0 ? (
          <div style={{ color: "var(--text-muted)", fontSize: 13 }}>No alerts set yet.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {rows.map(({ alert, commodity }) => {
              const isTriggered = isAlertTriggered(alert, commodity);
              const m = meta(alert.symbol);
              const typeDef = ALERT_TYPES[alert.type];
              return (
                <div
                  key={alert.id}
                  style={{
                    ...rowStyle,
                    borderColor: isTriggered ? "var(--critical)" : "var(--border)",
                    background: isTriggered ? "color-mix(in oklab, var(--critical) 8%, var(--surface-1))" : "var(--surface-1)",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{m?.name || alert.symbol}</div>
                    <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                      {typeDef.label} {typeDef.format(alert.threshold, m?.unit || "")}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                        {commodity?.available ? `Now: ${commodity.last?.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : "No data"}
                      </div>
                      <div style={{ fontSize: 11.5, fontWeight: 600, color: isTriggered ? "var(--critical)" : "var(--text-muted)" }}>
                        {isTriggered ? "Triggered" : "Watching"}
                      </div>
                    </div>
                    <button onClick={() => onRemove(alert.id)} style={removeButtonStyle} aria-label="Remove alert">
                      ×
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const notifyButtonStyle = {
  border: "1px solid var(--border)",
  borderRadius: 999,
  padding: "6px 14px",
  fontSize: 12.5,
  background: "transparent",
  color: "var(--text-secondary)",
  cursor: "pointer",
  flexShrink: 0,
};

const panelStyle = {
  background: "var(--surface-1)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: 16,
};

const selectStyle = {
  border: "1px solid var(--border)",
  borderRadius: 8,
  padding: "6px 8px",
  fontSize: 12.5,
  background: "var(--surface-2)",
  color: "var(--text-primary)",
};

const inputStyle = {
  border: "1px solid var(--border)",
  borderRadius: 8,
  padding: "6px 8px",
  fontSize: 12.5,
  width: 110,
  background: "var(--surface-2)",
  color: "var(--text-primary)",
};

const addButtonStyle = {
  border: "1px solid var(--series-1)",
  background: "var(--series-1)",
  color: "#fff",
  borderRadius: 8,
  padding: "6px 14px",
  fontSize: 12.5,
  fontWeight: 500,
  cursor: "pointer",
};

const rowStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  border: "1px solid var(--border)",
  borderRadius: 10,
  padding: "10px 12px",
};

const removeButtonStyle = {
  border: "none",
  background: "none",
  color: "var(--text-muted)",
  cursor: "pointer",
  fontSize: 18,
  lineHeight: 1,
  padding: "0 2px",
};

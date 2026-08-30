import { useEffect, useMemo, useState } from "react";
import { api } from "./api.js";
import Overview from "./components/Overview.jsx";
import DetailView from "./components/DetailView.jsx";
import CorrelationView from "./components/CorrelationView.jsx";
import AlertsPanel from "./components/AlertsPanel.jsx";
import SuggestionsPanel from "./components/SuggestionsPanel.jsx";
import ResearchPanel from "./components/ResearchPanel.jsx";
import CalendarView from "./components/CalendarView.jsx";
import TradeJournal from "./components/TradeJournal.jsx";
import SearchBar from "./components/SearchBar.jsx";
import {
  isAlertTriggered,
  loadAlerts,
  loadNotificationsEnabled,
  loadNotifiedAlertIds,
  loadWatchlist,
  saveAlerts,
  saveNotificationsEnabled,
  saveNotifiedAlertIds,
  saveWatchlist,
} from "./storage.js";

export default function App() {
  const [tab, setTab] = useState("overview"); // overview | correlation | alerts
  const [selectedSymbol, setSelectedSymbol] = useState(null);
  const [meta, setMeta] = useState(null);
  const [overview, setOverview] = useState(null);
  const [error, setError] = useState(null);
  const [watchlist, setWatchlist] = useState(() => loadWatchlist());
  const [alerts, setAlerts] = useState(() => loadAlerts());
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => loadNotificationsEnabled());
  const [notifiedAlertIds, setNotifiedAlertIds] = useState(() => loadNotifiedAlertIds());

  useEffect(() => {
    api.commodities().then(setMeta).catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    let cancelled = false;
    api
      .overview()
      .then((d) => !cancelled && setOverview(d))
      .catch((e) => !cancelled && setError(e.message));
    const id = setInterval(() => {
      api.overview().then((d) => !cancelled && setOverview(d)).catch(() => {});
    }, 5 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  useEffect(() => saveWatchlist(watchlist), [watchlist]);
  useEffect(() => saveAlerts(alerts), [alerts]);
  useEffect(() => saveNotificationsEnabled(notificationsEnabled), [notificationsEnabled]);
  useEffect(() => saveNotifiedAlertIds(notifiedAlertIds), [notifiedAlertIds]);

  function enableNotifications() {
    if (typeof Notification === "undefined") return;
    Notification.requestPermission().then((perm) => {
      setNotificationsEnabled(perm === "granted");
    });
  }

  // Fire a browser notification only on the transition into "triggered" —
  // never repeat for an alert that's already been notified about.
  useEffect(() => {
    if (!notificationsEnabled || !overview || typeof Notification === "undefined" || Notification.permission !== "granted") return;
    const bySymbol = new Map(overview.commodities.map((c) => [c.symbol, c]));
    const currentlyTriggered = new Set(alerts.filter((a) => isAlertTriggered(a, bySymbol.get(a.symbol))).map((a) => a.id));

    const newlyTriggered = alerts.filter((a) => currentlyTriggered.has(a.id) && !notifiedAlertIds.has(a.id));
    if (newlyTriggered.length > 0) {
      for (const a of newlyTriggered) {
        const c = bySymbol.get(a.symbol);
        const name = meta?.commodities.find((x) => x.symbol === a.symbol)?.name || a.symbol;
        new Notification(`${name} alert triggered`, {
          body: `Now ${c?.last?.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${c?.unit || ""}`,
        });
      }
    }

    // Keep notifiedAlertIds in sync with what's currently triggered, so an
    // alert that un-triggers and re-triggers later notifies again.
    const stillRelevant = new Set([...notifiedAlertIds].filter((id) => currentlyTriggered.has(id)));
    for (const a of newlyTriggered) stillRelevant.add(a.id);
    if (stillRelevant.size !== notifiedAlertIds.size || [...stillRelevant].some((id) => !notifiedAlertIds.has(id))) {
      setNotifiedAlertIds(stillRelevant);
    }
  }, [alerts, overview, notificationsEnabled, meta]);

  function toggleWatch(symbol) {
    setWatchlist((prev) => (prev.includes(symbol) ? prev.filter((s) => s !== symbol) : [...prev, symbol]));
  }

  function addAlert(alert) {
    setAlerts((prev) => [...prev, { ...alert, id: `${alert.symbol}-${alert.type}-${Date.now()}` }]);
  }

  function removeAlert(id) {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }

  const triggeredCount = useMemo(() => {
    if (!overview) return 0;
    const bySymbol = new Map(overview.commodities.map((c) => [c.symbol, c]));
    return alerts.filter((a) => isAlertTriggered(a, bySymbol.get(a.symbol))).length;
  }, [alerts, overview]);

  const triggeredSymbols = useMemo(() => {
    if (!overview) return new Set();
    const bySymbol = new Map(overview.commodities.map((c) => [c.symbol, c]));
    return new Set(alerts.filter((a) => isAlertTriggered(a, bySymbol.get(a.symbol))).map((a) => a.symbol));
  }, [alerts, overview]);

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "24px 20px 60px" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 8 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22 }}>Commodities Dashboard</h1>
          <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 2 }}>
            Live futures data via Yahoo Finance · updated every 5 minutes
          </div>
        </div>
        {selectedSymbol === null && meta && (
          <SearchBar allCommodities={meta.commodities} onSelect={setSelectedSymbol} />
        )}
        {selectedSymbol === null && (
          <nav style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <TabButton active={tab === "overview"} onClick={() => setTab("overview")}>
              Overview
            </TabButton>
            <TabButton active={tab === "correlation"} onClick={() => setTab("correlation")}>
              Correlation
            </TabButton>
            <TabButton active={tab === "suggestions"} onClick={() => setTab("suggestions")}>
              Suggestions
            </TabButton>
            <TabButton active={tab === "research"} onClick={() => setTab("research")}>
              Research
            </TabButton>
            <TabButton active={tab === "calendar"} onClick={() => setTab("calendar")}>
              Calendar
            </TabButton>
            <TabButton active={tab === "journal"} onClick={() => setTab("journal")}>
              Journal
            </TabButton>
            <TabButton active={tab === "alerts"} onClick={() => setTab("alerts")}>
              Alerts{triggeredCount > 0 ? ` (${triggeredCount})` : ""}
            </TabButton>
          </nav>
        )}
      </header>

      <div
        style={{
          fontSize: 11.5,
          color: "var(--text-muted)",
          background: "var(--surface-1)",
          border: "1px solid var(--border)",
          borderRadius: 8,
          padding: "8px 12px",
          marginBottom: 24,
        }}
      >
        Educational analysis only — not investment advice. Verify prices with your broker before placing any trade.
      </div>

      {error && <div style={{ color: "var(--critical)", marginBottom: 16 }}>Failed to load data: {error}</div>}

      {selectedSymbol ? (
        <DetailView
          symbol={selectedSymbol}
          onBack={() => setSelectedSymbol(null)}
          allCommodities={meta?.commodities || []}
          watched={watchlist.includes(selectedSymbol)}
          onToggleWatch={toggleWatch}
        />
      ) : tab === "overview" ? (
        overview && meta ? (
          <Overview
            overview={overview}
            sectors={meta.sectors}
            onSelect={setSelectedSymbol}
            watchlist={watchlist}
            onToggleWatch={toggleWatch}
            triggeredSymbols={triggeredSymbols}
          />
        ) : (
          !error && <div style={{ color: "var(--text-muted)" }}>Loading market data…</div>
        )
      ) : tab === "correlation" ? (
        <CorrelationView />
      ) : tab === "suggestions" ? (
        <SuggestionsPanel onSelect={setSelectedSymbol} />
      ) : tab === "research" ? (
        meta && <ResearchPanel allCommodities={meta.commodities} onSelect={setSelectedSymbol} />
      ) : tab === "calendar" ? (
        meta && <CalendarView allCommodities={meta.commodities} />
      ) : tab === "journal" ? (
        meta && <TradeJournal allCommodities={meta.commodities} overview={overview} />
      ) : (
        meta && (
          <AlertsPanel
            allCommodities={meta.commodities}
            overview={overview}
            alerts={alerts}
            onAdd={addAlert}
            onRemove={removeAlert}
            notificationsEnabled={notificationsEnabled}
            onEnableNotifications={enableNotifications}
          />
        )
      )}
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        border: "1px solid var(--border)",
        borderRadius: 999,
        padding: "6px 16px",
        fontSize: 13,
        fontWeight: 500,
        cursor: "pointer",
        background: active ? "var(--series-1)" : "transparent",
        color: active ? "#fff" : "var(--text-secondary)",
        borderColor: active ? "var(--series-1)" : "var(--border)",
      }}
    >
      {children}
    </button>
  );
}

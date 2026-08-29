import { useEffect, useMemo, useState } from "react";
import { api } from "../api.js";

function fmtDate(iso) {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function daysFromToday(iso) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${iso}T00:00:00`);
  return Math.round((target - today) / 86400000);
}

export default function CalendarView({ allCommodities }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.calendar(28).then(setData).catch((e) => setError(e.message));
  }, []);

  const nameBySymbol = useMemo(() => Object.fromEntries(allCommodities.map((c) => [c.symbol, c.name])), [allCommodities]);

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
          marginBottom: 16,
        }}
      >
        Recurring release schedule for reports known to move these markets — computed, not fetched live. Dates
        within the next ~10 days are reliable; monthly reports (WASDE, Cattle on Feed) are approximate. Always check
        the source agency's own calendar before treating a date as fixed.
      </div>

      {error && <div style={{ color: "var(--critical)" }}>{error}</div>}
      {!data && !error && <div style={{ color: "var(--text-muted)" }}>Loading calendar…</div>}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {data?.events.map((ev, i) => {
          const days = daysFromToday(ev.date);
          const affectedNames =
            ev.affected === "all" ? "All commodities" : ev.affected.map((s) => nameBySymbol[s] || s).join(", ");
          return (
            <div key={i} style={rowStyle}>
              <div style={{ textAlign: "center", minWidth: 70, flexShrink: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{fmtDate(ev.date)}</div>
                <div style={{ fontSize: 10.5, color: "var(--text-muted)" }}>
                  {days === 0 ? "Today" : days === 1 ? "Tomorrow" : `in ${days}d`}
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{ev.name}</div>
                <div style={{ fontSize: 11.5, color: "var(--text-secondary)" }}>{affectedNames}</div>
              </div>
              <div style={{ textAlign: "right", fontSize: 11, color: "var(--text-muted)", flexShrink: 0 }}>
                {ev.time && <div>{ev.time}</div>}
                <div>{ev.frequency}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const rowStyle = {
  display: "flex",
  alignItems: "center",
  gap: 14,
  background: "var(--surface-1)",
  border: "1px solid var(--border)",
  borderRadius: 10,
  padding: "10px 14px",
};

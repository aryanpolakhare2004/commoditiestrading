import { useEffect, useMemo, useState } from "react";
import { api } from "../api.js";

const SENTIMENT_COLOR = {
  Positive: "var(--good)",
  Negative: "var(--critical)",
  Neutral: "var(--text-muted)",
};

const FILTERS = ["All", "Positive", "Negative"];

function timeAgo(iso) {
  if (!iso) return "";
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export default function MarketNewsFeed({ allCommodities, onSelect }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    api.newsFeed(4).then(setData).catch((e) => setError(e.message));
  }, []);

  const sectorBySymbol = useMemo(() => Object.fromEntries(allCommodities.map((c) => [c.symbol, c.sector])), [allCommodities]);

  const items = useMemo(() => {
    if (!data) return [];
    if (filter === "Positive") return data.items.filter((i) => i.sentimentLabel === "Positive");
    if (filter === "Negative") return data.items.filter((i) => i.sentimentLabel === "Negative");
    return data.items;
  }, [data, filter]);

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
        Recent headlines across all 28 commodities, each scored with VADER sentiment, most recent first.
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              border: "1px solid var(--border)",
              borderRadius: 999,
              padding: "5px 14px",
              fontSize: 13,
              cursor: "pointer",
              background: filter === f ? "var(--series-1)" : "transparent",
              color: filter === f ? "#fff" : "var(--text-secondary)",
              borderColor: filter === f ? "var(--series-1)" : "var(--border)",
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {error && <div style={{ color: "var(--critical)" }}>{error}</div>}
      {!data && !error && <div style={{ color: "var(--text-muted)" }}>Loading news across all commodities…</div>}

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {items.map((item, i) => (
          <div key={i} style={rowStyle}>
            <span
              title={item.sentimentLabel}
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                flexShrink: 0,
                marginTop: 6,
                background: SENTIMENT_COLOR[item.sentimentLabel] || "var(--text-muted)",
              }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <a href={item.link} target="_blank" rel="noreferrer" style={{ color: "var(--text-primary)", textDecoration: "none", fontSize: 13.5, fontWeight: 500 }}>
                {item.title}
              </a>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2, display: "flex", gap: 6, flexWrap: "wrap" }}>
                <button onClick={() => onSelect(item.symbol)} style={symbolLinkStyle}>
                  {item.name}
                </button>
                <span>· {sectorBySymbol[item.symbol]}</span>
                <span>· {item.publisher || "Unknown source"}</span>
                <span>· {timeAgo(item.publishedAt)}</span>
              </div>
            </div>
          </div>
        ))}
        {data && items.length === 0 && <div style={{ color: "var(--text-muted)", fontSize: 13 }}>No headlines match this filter.</div>}
      </div>
    </div>
  );
}

const rowStyle = {
  display: "flex",
  gap: 8,
  background: "var(--surface-1)",
  border: "1px solid var(--border)",
  borderRadius: 10,
  padding: "10px 12px",
};

const symbolLinkStyle = {
  border: "none",
  background: "none",
  padding: 0,
  color: "var(--text-muted)",
  cursor: "pointer",
  font: "inherit",
  fontSize: 11,
  textDecoration: "underline",
};

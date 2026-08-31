import { useState } from "react";
import Sparkline from "./Sparkline.jsx";
import Delta from "./Delta.jsx";
import NewsList from "./NewsList.jsx";

const TYPE_LABEL = {
  producer: "Producer",
  consumer: "Consumer",
  processor: "Processor",
  refiner: "Refiner",
  streamer: "Streamer",
  etf: "ETF",
};

const SENTIMENT_COLOR = {
  Positive: "var(--good)",
  Negative: "var(--critical)",
  Neutral: "var(--text-muted)",
};

function SentimentBadge({ sentiment }) {
  if (!sentiment || sentiment.count === 0) {
    return <span style={{ fontSize: 11, color: "var(--text-muted)" }}>No recent news</span>;
  }
  return (
    <span style={{ fontSize: 11, fontWeight: 600, color: SENTIMENT_COLOR[sentiment.label] || "var(--text-muted)" }}>
      <span
        style={{
          display: "inline-block",
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: SENTIMENT_COLOR[sentiment.label] || "var(--text-muted)",
          marginRight: 5,
        }}
      />
      {sentiment.label} ({sentiment.count})
    </span>
  );
}

export default function RelatedAssets({ items }) {
  const [expanded, setExpanded] = useState(null);

  if (!items || items.length === 0) {
    return (
      <div style={{ color: "var(--text-muted)", fontSize: 13 }}>
        No curated stocks or ETFs mapped to this commodity yet.
      </div>
    );
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
        gap: 12,
        alignItems: "start",
      }}
    >
      {items.map((item) => {
        const isExpanded = expanded === item.symbol;
        return item.available ? (
          <div key={item.symbol} style={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{item.symbol}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{item.name}</div>
              </div>
              <span style={typeBadgeStyle}>{TYPE_LABEL[item.type] || item.type}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 10 }}>
              <div>
                <div style={{ fontSize: 17, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                  ${item.last?.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </div>
                <Delta value={item.change1d} label="1D" />
              </div>
              <Sparkline values={item.sparkline} width={80} height={26} positive={(item.change1d ?? 0) >= 0} />
            </div>

            <button
              onClick={() => setExpanded((prev) => (prev === item.symbol ? null : item.symbol))}
              style={newsToggleStyle}
              disabled={!item.news || item.news.length === 0}
            >
              <SentimentBadge sentiment={item.sentiment} />
              {item.news?.length > 0 && <span style={{ color: "var(--text-muted)" }}>{isExpanded ? "Hide news ▲" : "Show news ▼"}</span>}
            </button>

            {isExpanded && item.news?.length > 0 && (
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
                <NewsList items={item.news} />
              </div>
            )}
          </div>
        ) : (
          <div key={item.symbol} style={cardStyle}>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{item.symbol}</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{item.name}</div>
            <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 8 }}>No data available</div>
          </div>
        );
      })}
    </div>
  );
}

const cardStyle = {
  background: "var(--surface-2)",
  border: "1px solid var(--border)",
  borderRadius: 10,
  padding: 12,
};

const typeBadgeStyle = {
  fontSize: 10,
  color: "var(--text-muted)",
  border: "1px solid var(--border)",
  borderRadius: 999,
  padding: "2px 7px",
  flexShrink: 0,
  marginLeft: 6,
};

const newsToggleStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  width: "100%",
  border: "none",
  background: "none",
  padding: 0,
  marginTop: 10,
  paddingTop: 10,
  borderTop: "1px solid var(--border)",
  fontSize: 11,
  cursor: "pointer",
  color: "inherit",
  font: "inherit",
};

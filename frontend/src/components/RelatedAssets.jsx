import Sparkline from "./Sparkline.jsx";
import Delta from "./Delta.jsx";

const TYPE_LABEL = {
  producer: "Producer",
  consumer: "Consumer",
  processor: "Processor",
  refiner: "Refiner",
  streamer: "Streamer",
  etf: "ETF",
};

export default function RelatedAssets({ items }) {
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
        gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
        gap: 12,
      }}
    >
      {items.map((item) =>
        item.available ? (
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
          </div>
        ) : (
          <div key={item.symbol} style={cardStyle}>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{item.symbol}</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{item.name}</div>
            <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 8 }}>No data available</div>
          </div>
        )
      )}
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

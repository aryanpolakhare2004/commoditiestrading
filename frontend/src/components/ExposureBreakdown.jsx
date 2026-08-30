import { useMemo } from "react";

export default function ExposureBreakdown({ openTrades, allCommodities, specs, priceBySymbol }) {
  const bySector = useMemo(() => {
    const sectorOf = Object.fromEntries(allCommodities.map((c) => [c.symbol, c.sector]));
    const map = new Map();

    for (const t of openTrades) {
      const cs = specs[t.symbol]?.contractSize || 1;
      const price = priceBySymbol[t.symbol] ?? t.entryPrice;
      const notional = price * cs * t.quantity * (t.side === "long" ? 1 : -1);
      const sector = sectorOf[t.symbol] || "Other";
      map.set(sector, (map.get(sector) || 0) + notional);
    }

    return Array.from(map.entries()).map(([sector, net]) => ({ sector, net }));
  }, [openTrades, allCommodities, specs, priceBySymbol]);

  const grossTotal = bySector.reduce((sum, s) => sum + Math.abs(s.net), 0);
  const netTotal = bySector.reduce((sum, s) => sum + s.net, 0);

  if (openTrades.length === 0) {
    return <div style={{ color: "var(--text-muted)", fontSize: 13 }}>No open positions to break down.</div>;
  }

  const maxAbs = Math.max(...bySector.map((s) => Math.abs(s.net)), 1);

  return (
    <div>
      <div style={{ display: "flex", gap: 24, marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Gross exposure</div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>${grossTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Net exposure</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: netTotal >= 0 ? "var(--delta-up)" : "var(--delta-down)" }}>
            {netTotal >= 0 ? "+" : ""}${netTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {bySector
          .sort((a, b) => Math.abs(b.net) - Math.abs(a.net))
          .map(({ sector, net }) => (
            <div key={sector} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 90, fontSize: 12, color: "var(--text-secondary)", flexShrink: 0 }}>{sector}</span>
              <div style={{ position: "relative", flex: 1, height: 10, background: "var(--grid)", borderRadius: 5 }}>
                <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 1, background: "var(--axis)" }} />
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    bottom: 0,
                    width: `${(Math.abs(net) / maxAbs) * 50}%`,
                    left: net >= 0 ? "50%" : `${50 - (Math.abs(net) / maxAbs) * 50}%`,
                    background: net >= 0 ? "var(--delta-up)" : "var(--delta-down)",
                    borderRadius: 5,
                  }}
                />
              </div>
              <span
                style={{
                  width: 90,
                  textAlign: "right",
                  fontSize: 12,
                  fontVariantNumeric: "tabular-nums",
                  color: net >= 0 ? "var(--delta-up)" : "var(--delta-down)",
                  flexShrink: 0,
                }}
              >
                {net >= 0 ? "+" : ""}${Math.abs(net) >= 1000 ? `${(net / 1000).toFixed(1)}k` : net.toFixed(0)}
              </span>
            </div>
          ))}
      </div>
    </div>
  );
}

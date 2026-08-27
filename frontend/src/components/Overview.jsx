import { useMemo, useState } from "react";
import CommodityCard from "./CommodityCard.jsx";
import SectorBar from "./SectorBar.jsx";

export default function Overview({ overview, sectors, onSelect, watchlist, onToggleWatch, triggeredSymbols }) {
  const [sectorFilter, setSectorFilter] = useState("All");

  const filtered = useMemo(() => {
    let list = overview.commodities;
    if (sectorFilter === "Watchlist") list = list.filter((c) => watchlist.includes(c.symbol));
    else if (sectorFilter !== "All") list = list.filter((c) => c.sector === sectorFilter);
    return list;
  }, [overview, sectorFilter, watchlist]);

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {["All", "Watchlist", ...sectors].map((s) => (
          <button
            key={s}
            onClick={() => setSectorFilter(s)}
            style={{
              border: "1px solid var(--border)",
              borderRadius: 999,
              padding: "5px 14px",
              fontSize: 13,
              cursor: "pointer",
              background: sectorFilter === s ? "var(--series-1)" : "transparent",
              color: sectorFilter === s ? "#fff" : "var(--text-secondary)",
              borderColor: sectorFilter === s ? "var(--series-1)" : "var(--border)",
            }}
          >
            {s === "Watchlist" ? `★ Watchlist${watchlist.length ? ` (${watchlist.length})` : ""}` : s}
          </button>
        ))}
      </div>

      {sectorFilter === "Watchlist" && filtered.length === 0 && (
        <div style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 20 }}>
          No commodities starred yet — click the ☆ on any card to add it here.
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))",
          gap: 14,
          marginBottom: 32,
        }}
      >
        {filtered.map((c) => (
          <CommodityCard
            key={c.symbol}
            commodity={c}
            onSelect={onSelect}
            watched={watchlist.includes(c.symbol)}
            onToggleWatch={onToggleWatch}
            alertTriggered={triggeredSymbols.has(c.symbol)}
          />
        ))}
      </div>

      <div style={panelStyle}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>1-Month Performance</div>
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>
          Percent change over the trailing 21 trading days, all covered commodities.
        </div>
        <SectorBar commodities={overview.commodities} />
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

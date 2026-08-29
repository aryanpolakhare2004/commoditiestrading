import { useEffect, useMemo, useState } from "react";
import { api } from "../api.js";
import { loadJournal, saveJournal } from "../storage.js";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function pnl(side, entry, exit, qty, contractSize) {
  const direction = side === "long" ? 1 : -1;
  const dollar = (exit - entry) * contractSize * qty * direction;
  const pct = ((exit - entry) / entry) * 100 * direction;
  return { dollar, pct };
}

export default function TradeJournal({ allCommodities, overview }) {
  const [trades, setTrades] = useState(() => loadJournal());
  const [specs, setSpecs] = useState({});
  const [form, setForm] = useState({
    symbol: allCommodities[0]?.symbol || "",
    side: "long",
    quantity: 1,
    entryPrice: "",
    entryDate: todayStr(),
    notes: "",
  });
  const [closing, setClosing] = useState({}); // tradeId -> { exitPrice, exitDate }

  useEffect(() => saveJournal(trades), [trades]);
  useEffect(() => {
    api
      .contracts()
      .then((d) => setSpecs(d.specs))
      .catch(() => setSpecs({}));
  }, []);

  const nameBySymbol = useMemo(() => Object.fromEntries(allCommodities.map((c) => [c.symbol, c.name])), [allCommodities]);
  const priceBySymbol = useMemo(
    () => Object.fromEntries((overview?.commodities || []).filter((c) => c.available).map((c) => [c.symbol, c.last])),
    [overview]
  );

  const open = trades.filter((t) => !t.exitPrice);
  const closed = trades.filter((t) => t.exitPrice);

  const realizedTotal = closed.reduce((sum, t) => {
    const cs = specs[t.symbol]?.contractSize || 1;
    return sum + pnl(t.side, t.entryPrice, t.exitPrice, t.quantity, cs).dollar;
  }, 0);
  const winRate = closed.length
    ? (closed.filter((t) => pnl(t.side, t.entryPrice, t.exitPrice, t.quantity, specs[t.symbol]?.contractSize || 1).dollar > 0).length /
        closed.length) *
      100
    : null;

  function addTrade(e) {
    e.preventDefault();
    const entryPrice = parseFloat(form.entryPrice);
    const quantity = parseInt(form.quantity, 10);
    if (!form.symbol || Number.isNaN(entryPrice) || !quantity) return;
    setTrades((prev) => [
      {
        id: `${form.symbol}-${Date.now()}`,
        symbol: form.symbol,
        side: form.side,
        quantity,
        entryPrice,
        entryDate: form.entryDate,
        exitPrice: null,
        exitDate: null,
        notes: form.notes,
      },
      ...prev,
    ]);
    setForm((f) => ({ ...f, entryPrice: "", notes: "" }));
  }

  function closeTrade(id) {
    const c = closing[id];
    const exitPrice = parseFloat(c?.exitPrice);
    if (Number.isNaN(exitPrice)) return;
    setTrades((prev) =>
      prev.map((t) => (t.id === id ? { ...t, exitPrice, exitDate: c?.exitDate || todayStr() } : t))
    );
    setClosing((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  function removeTrade(id) {
    setTrades((prev) => prev.filter((t) => t.id !== id));
  }

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
        Stored in this browser only (localStorage) — private to you, not synced anywhere. $ P&L uses the reference
        contract sizes from the position calculator; verify against your actual fills and broker statement.
      </div>

      <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginBottom: 20 }}>
        <Stat label="Open positions" value={open.length} />
        <Stat label="Closed trades" value={closed.length} />
        <Stat
          label="Realized P&L"
          value={closed.length ? `${realizedTotal >= 0 ? "+" : ""}$${realizedTotal.toFixed(2)}` : "—"}
          color={closed.length ? (realizedTotal >= 0 ? "var(--delta-up)" : "var(--delta-down)") : undefined}
        />
        <Stat label="Win rate" value={winRate === null ? "—" : `${winRate.toFixed(0)}%`} />
      </div>

      <form onSubmit={addTrade} style={formStyle}>
        <select value={form.symbol} onChange={(e) => setForm((f) => ({ ...f, symbol: e.target.value }))} style={selectStyle}>
          {allCommodities.map((c) => (
            <option key={c.symbol} value={c.symbol}>
              {c.name}
            </option>
          ))}
        </select>
        <select value={form.side} onChange={(e) => setForm((f) => ({ ...f, side: e.target.value }))} style={selectStyle}>
          <option value="long">Long</option>
          <option value="short">Short</option>
        </select>
        <input
          type="number"
          min="1"
          value={form.quantity}
          onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
          style={{ ...inputStyle, width: 70 }}
          placeholder="Qty"
        />
        <input
          type="number"
          step="any"
          value={form.entryPrice}
          onChange={(e) => setForm((f) => ({ ...f, entryPrice: e.target.value }))}
          style={{ ...inputStyle, width: 110 }}
          placeholder="Entry price"
          required
        />
        <input
          type="date"
          value={form.entryDate}
          onChange={(e) => setForm((f) => ({ ...f, entryDate: e.target.value }))}
          style={inputStyle}
        />
        <input
          type="text"
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          style={{ ...inputStyle, flex: 1, minWidth: 140 }}
          placeholder="Notes (optional)"
        />
        <button type="submit" style={addButtonStyle}>
          Log trade
        </button>
      </form>

      {open.length > 0 && (
        <>
          <div style={sectionLabelStyle}>Open Positions</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
            {open.map((t) => {
              const cs = specs[t.symbol]?.contractSize || 1;
              const cur = priceBySymbol[t.symbol];
              const unrealized = cur !== undefined ? pnl(t.side, t.entryPrice, cur, t.quantity, cs) : null;
              const c = closing[t.id] || {};
              return (
                <div key={t.id} style={rowStyle}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>
                      {t.side === "long" ? "▲" : "▼"} {nameBySymbol[t.symbol] || t.symbol} × {t.quantity}
                    </div>
                    <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
                      Entered {t.entryDate} @ {t.entryPrice}
                      {t.notes ? ` · ${t.notes}` : ""}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0, marginRight: 12 }}>
                    {unrealized ? (
                      <>
                        <div style={{ fontWeight: 700, color: unrealized.dollar >= 0 ? "var(--delta-up)" : "var(--delta-down)" }}>
                          {unrealized.dollar >= 0 ? "+" : ""}${unrealized.dollar.toFixed(2)}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                          {unrealized.pct >= 0 ? "+" : ""}
                          {unrealized.pct.toFixed(2)}% · now {cur}
                        </div>
                      </>
                    ) : (
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>no live price</div>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
                    <input
                      type="number"
                      step="any"
                      placeholder="Exit price"
                      value={c.exitPrice || ""}
                      onChange={(e) => setClosing((prev) => ({ ...prev, [t.id]: { ...prev[t.id], exitPrice: e.target.value } }))}
                      style={{ ...inputStyle, width: 90 }}
                    />
                    <button onClick={() => closeTrade(t.id)} style={smallButtonStyle}>
                      Close
                    </button>
                    <button onClick={() => removeTrade(t.id)} style={removeButtonStyle} aria-label="Delete trade">
                      ×
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {closed.length > 0 && (
        <>
          <div style={sectionLabelStyle}>Closed Trades</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {closed.map((t) => {
              const cs = specs[t.symbol]?.contractSize || 1;
              const r = pnl(t.side, t.entryPrice, t.exitPrice, t.quantity, cs);
              return (
                <div key={t.id} style={rowStyle}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>
                      {t.side === "long" ? "▲" : "▼"} {nameBySymbol[t.symbol] || t.symbol} × {t.quantity}
                    </div>
                    <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
                      {t.entryDate} @ {t.entryPrice} → {t.exitDate} @ {t.exitPrice}
                      {t.notes ? ` · ${t.notes}` : ""}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0, marginRight: 12 }}>
                    <div style={{ fontWeight: 700, color: r.dollar >= 0 ? "var(--delta-up)" : "var(--delta-down)" }}>
                      {r.dollar >= 0 ? "+" : ""}${r.dollar.toFixed(2)}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      {r.pct >= 0 ? "+" : ""}
                      {r.pct.toFixed(2)}%
                    </div>
                  </div>
                  <button onClick={() => removeTrade(t.id)} style={removeButtonStyle} aria-label="Delete trade">
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}

      {trades.length === 0 && <div style={{ color: "var(--text-muted)", fontSize: 13 }}>No trades logged yet.</div>}
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: color || "var(--text-primary)" }}>{value}</div>
    </div>
  );
}

const formStyle = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  alignItems: "center",
  background: "var(--surface-1)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: 14,
  marginBottom: 24,
};

const sectionLabelStyle = { fontSize: 13, fontWeight: 600, margin: "0 0 10px" };

const selectStyle = {
  border: "1px solid var(--border)",
  borderRadius: 8,
  padding: "7px 8px",
  fontSize: 12.5,
  background: "var(--surface-2)",
  color: "var(--text-primary)",
};

const inputStyle = {
  border: "1px solid var(--border)",
  borderRadius: 8,
  padding: "7px 8px",
  fontSize: 12.5,
  background: "var(--surface-2)",
  color: "var(--text-primary)",
};

const addButtonStyle = {
  border: "1px solid var(--series-1)",
  background: "var(--series-1)",
  color: "#fff",
  borderRadius: 8,
  padding: "7px 14px",
  fontSize: 12.5,
  fontWeight: 500,
  cursor: "pointer",
};

const smallButtonStyle = {
  border: "1px solid var(--border)",
  borderRadius: 8,
  padding: "6px 10px",
  fontSize: 12,
  background: "transparent",
  color: "var(--text-secondary)",
  cursor: "pointer",
};

const removeButtonStyle = {
  border: "none",
  background: "none",
  color: "var(--text-muted)",
  cursor: "pointer",
  fontSize: 18,
  lineHeight: 1,
  padding: "0 4px",
};

const rowStyle = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  background: "var(--surface-1)",
  border: "1px solid var(--border)",
  borderRadius: 10,
  padding: "10px 14px",
};

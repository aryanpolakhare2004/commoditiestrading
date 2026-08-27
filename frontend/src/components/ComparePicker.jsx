import { useEffect, useMemo, useRef, useState } from "react";

export default function ComparePicker({ allCommodities, excludeSymbols, onAdd, disabled }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    function onDocClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const options = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allCommodities
      .filter((c) => !excludeSymbols.includes(c.symbol))
      .filter((c) => !q || c.name.toLowerCase().includes(q) || c.symbol.toLowerCase().includes(q));
  }, [allCommodities, excludeSymbols, query]);

  if (disabled) return null;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={() => setOpen((o) => !o)} style={addButtonStyle}>
        + Compare
      </button>
      {open && (
        <div style={dropdownStyle}>
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search commodities…"
            style={inputStyle}
          />
          <div style={{ maxHeight: 220, overflowY: "auto" }}>
            {options.map((c) => (
              <button
                key={c.symbol}
                onClick={() => {
                  onAdd(c.symbol);
                  setOpen(false);
                  setQuery("");
                }}
                style={optionStyle}
              >
                <span>{c.name}</span>
                <span style={{ color: "var(--text-muted)", fontSize: 11 }}>{c.sector}</span>
              </button>
            ))}
            {options.length === 0 && (
              <div style={{ padding: "8px 10px", fontSize: 12, color: "var(--text-muted)" }}>No matches</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const addButtonStyle = {
  border: "1px dashed var(--border)",
  borderRadius: 999,
  padding: "4px 12px",
  fontSize: 12,
  color: "var(--text-secondary)",
  background: "transparent",
  cursor: "pointer",
};

const dropdownStyle = {
  position: "absolute",
  top: "calc(100% + 6px)",
  left: 0,
  width: 240,
  background: "var(--surface-2)",
  border: "1px solid var(--border)",
  borderRadius: 10,
  boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
  padding: 6,
  zIndex: 20,
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  border: "1px solid var(--border)",
  borderRadius: 6,
  padding: "6px 8px",
  fontSize: 12.5,
  marginBottom: 6,
  background: "var(--surface-1)",
  color: "var(--text-primary)",
};

const optionStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  width: "100%",
  textAlign: "left",
  border: "none",
  background: "transparent",
  padding: "6px 8px",
  borderRadius: 6,
  fontSize: 12.5,
  color: "var(--text-primary)",
  cursor: "pointer",
};

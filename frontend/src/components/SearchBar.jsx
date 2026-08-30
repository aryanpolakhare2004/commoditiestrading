import { useMemo, useRef, useState } from "react";

export default function SearchBar({ allCommodities, onSelect }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const ref = useRef(null);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return allCommodities
      .filter((c) => c.name.toLowerCase().includes(q) || c.symbol.toLowerCase().includes(q) || c.sector.toLowerCase().includes(q))
      .slice(0, 8);
  }, [query, allCommodities]);

  function pick(c) {
    onSelect(c.symbol);
    setQuery("");
    setOpen(false);
    ref.current?.blur();
  }

  function handleKeyDown(e) {
    if (!open || matches.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, matches.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      pick(matches[activeIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
      ref.current?.blur();
    }
  }

  return (
    <div style={{ position: "relative", width: 220 }}>
      <input
        ref={ref}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setActiveIndex(0);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={handleKeyDown}
        placeholder="Search commodities…"
        style={inputStyle}
      />
      {open && matches.length > 0 && (
        <div style={dropdownStyle}>
          {matches.map((c, i) => (
            <button key={c.symbol} onMouseDown={() => pick(c)} style={{ ...optionStyle, background: i === activeIndex ? "var(--grid)" : "transparent" }}>
              <span>{c.name}</span>
              <span style={{ color: "var(--text-muted)", fontSize: 11 }}>
                {c.symbol.replace("=F", "")} · {c.sector}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  border: "1px solid var(--border)",
  borderRadius: 999,
  padding: "7px 12px",
  fontSize: 12.5,
  background: "var(--surface-1)",
  color: "var(--text-primary)",
};

const dropdownStyle = {
  position: "absolute",
  top: "calc(100% + 6px)",
  left: 0,
  right: 0,
  background: "var(--surface-2)",
  border: "1px solid var(--border)",
  borderRadius: 10,
  boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
  padding: 4,
  zIndex: 30,
};

const optionStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  width: "100%",
  textAlign: "left",
  border: "none",
  background: "transparent",
  padding: "7px 10px",
  borderRadius: 6,
  fontSize: 12.5,
  color: "var(--text-primary)",
  cursor: "pointer",
};

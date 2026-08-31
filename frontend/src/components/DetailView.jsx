import { useEffect, useMemo, useState } from "react";
import { api } from "../api.js";
import PriceChart from "./PriceChart.jsx";
import CompareChart from "./CompareChart.jsx";
import ComparePicker from "./ComparePicker.jsx";
import VolumeChart from "./VolumeChart.jsx";
import RsiChart from "./RsiChart.jsx";
import MacdChart from "./MacdChart.jsx";
import VolatilityChart from "./VolatilityChart.jsx";
import DrawdownChart from "./DrawdownChart.jsx";
import ReturnsHistogram from "./ReturnsHistogram.jsx";
import SeasonalityChart from "./SeasonalityChart.jsx";
import BacktestEvidence from "./BacktestEvidence.jsx";
import TradeSetupPanel from "./TradeSetupPanel.jsx";
import RelatedAssets from "./RelatedAssets.jsx";
import SignalBadge from "./SignalBadge.jsx";
import Delta from "./Delta.jsx";
import NewsList from "./NewsList.jsx";
import { downloadSeriesCsv } from "../csv.js";

const PERIODS = [
  { label: "5D", value: "5d" },
  { label: "1M", value: "1mo" },
  { label: "6M", value: "6mo" },
  { label: "YTD", value: "ytd" },
  { label: "1Y", value: "1y" },
  { label: "5Y", value: "5y" },
  { label: "Max", value: "max" },
];

const TABS = [
  { key: "chart", label: "Chart" },
  { key: "technicals", label: "Technicals" },
  { key: "risk", label: "Risk & Backtest" },
  { key: "tradesetup", label: "Trade Setup" },
  { key: "seasonality", label: "Seasonality" },
  { key: "related", label: "Related" },
  { key: "news", label: "News" },
];

const COMPARE_COLORS = ["var(--series-2)", "var(--series-3)", "var(--series-4)", "var(--series-5)"];
const MAX_COMPARE = 4;

function firstClose(series) {
  return series.find((d) => d.close !== null && d.close !== undefined)?.close ?? null;
}

function buildCompareData(primarySymbol, primarySeries, compareSeriesMap) {
  const base = { [primarySymbol]: firstClose(primarySeries) };
  Object.entries(compareSeriesMap).forEach(([sym, h]) => {
    base[sym] = firstClose(h.series);
  });

  const rows = new Map();
  const add = (sym, series) => {
    const b = base[sym];
    if (b === null || b === undefined) return;
    series.forEach((d) => {
      if (d.close === null || d.close === undefined) return;
      const row = rows.get(d.date) || { date: d.date };
      row[sym] = (d.close / b - 1) * 100;
      rows.set(d.date, row);
    });
  };
  add(primarySymbol, primarySeries);
  Object.entries(compareSeriesMap).forEach(([sym, h]) => add(sym, h.series));

  return Array.from(rows.values()).sort((a, b) => a.date.localeCompare(b.date));
}

export default function DetailView({ symbol, onBack, allCommodities, watched, onToggleWatch }) {
  const [period, setPeriod] = useState("1y");
  const [tab, setTab] = useState("chart");
  const [history, setHistory] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [news, setNews] = useState(null);
  const [seasonality, setSeasonality] = useState(null);
  const [backtest, setBacktest] = useState(null);
  const [related, setRelated] = useState(null);
  const [error, setError] = useState(null);
  const [hoverPoint, setHoverPoint] = useState(null);
  const [compare, setCompare] = useState([]);
  const [compareHistory, setCompareHistory] = useState({});

  useEffect(() => {
    let cancelled = false;
    setHistory(null);
    setAnalysis(null);
    setError(null);
    setHoverPoint(null);
    Promise.all([api.history(symbol, period), api.analysis(symbol, period)])
      .then(([h, a]) => {
        if (cancelled) return;
        setHistory(h);
        setAnalysis(a);
      })
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [symbol, period]);

  useEffect(() => {
    let cancelled = false;
    setNews(null);
    api
      .news(symbol)
      .then((n) => !cancelled && setNews(n))
      .catch(() => !cancelled && setNews({ items: [] }));
    return () => {
      cancelled = true;
    };
  }, [symbol]);

  useEffect(() => {
    let cancelled = false;
    setRelated(null);
    api
      .related(symbol)
      .then((r) => !cancelled && setRelated(r))
      .catch(() => !cancelled && setRelated({ items: [] }));
    return () => {
      cancelled = true;
    };
  }, [symbol]);

  useEffect(() => {
    let cancelled = false;
    setSeasonality(null);
    api
      .seasonality(symbol)
      .then((s) => !cancelled && setSeasonality(s))
      .catch(() => !cancelled && setSeasonality(null));
    return () => {
      cancelled = true;
    };
  }, [symbol]);

  useEffect(() => {
    let cancelled = false;
    setBacktest(null);
    api
      .backtest(symbol)
      .then((b) => !cancelled && setBacktest(b))
      .catch(() => !cancelled && setBacktest(null));
    return () => {
      cancelled = true;
    };
  }, [symbol]);

  useEffect(() => {
    setCompare([]);
    setTab("chart");
  }, [symbol]);

  useEffect(() => {
    if (compare.length === 0) {
      setCompareHistory({});
      return;
    }
    let cancelled = false;
    Promise.all(compare.map((sym) => api.history(sym, period).then((h) => [sym, h])))
      .then((pairs) => {
        if (cancelled) return;
        setCompareHistory(Object.fromEntries(pairs));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [compare, period]);

  const meta = history?.meta || analysis?.meta;

  const compareData = useMemo(() => {
    if (!history || compare.length === 0) return null;
    if (compare.some((sym) => !compareHistory[sym])) return null;
    return buildCompareData(symbol, history.series, compareHistory);
  }, [history, compare, compareHistory, symbol]);

  const compareSeriesMeta = useMemo(() => {
    if (!meta) return [];
    const primary = { symbol, label: meta.name, color: "var(--text-primary)", primary: true };
    const others = compare.map((sym, i) => ({
      symbol: sym,
      label: (allCommodities.find((c) => c.symbol === sym) || {}).name || sym,
      color: COMPARE_COLORS[i % COMPARE_COLORS.length],
      primary: false,
    }));
    return [primary, ...others];
  }, [meta, compare, symbol, allCommodities]);

  const isComparing = compare.length > 0;

  const displayPrice = hoverPoint ? hoverPoint.close : analysis?.last;
  const displayDate = hoverPoint?.date;
  const rangeStart = history ? firstClose(history.series) : null;
  const hoverDeltaPct = hoverPoint && rangeStart ? (hoverPoint.close / rangeStart - 1) * 100 : null;
  const rangeEnd = history ? history.series.at(-1)?.close : null;
  const periodPositive = rangeStart != null && rangeEnd != null ? rangeEnd >= rangeStart : (analysis?.change1d ?? 0) >= 0;

  return (
    <div>
      <button onClick={onBack} style={backButtonStyle}>
        ← Back to overview
      </button>

      {error && <div style={{ color: "var(--critical)", marginTop: 16 }}>{error}</div>}

      {meta && (
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginTop: 8 }}>
          <div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
              {meta.sector} · {meta.symbol.replace("=F", "")}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <h1 style={{ margin: "2px 0 6px", fontSize: 26 }}>{meta.name}</h1>
              <button
                onClick={() => onToggleWatch(symbol)}
                aria-label={watched ? "Remove from watchlist" : "Add to watchlist"}
                aria-pressed={watched}
                style={{ border: "none", background: "none", cursor: "pointer", fontSize: 22, lineHeight: 1, color: watched ? "var(--warning)" : "var(--text-muted)" }}
              >
                {watched ? "★" : "☆"}
              </button>
            </div>
            {analysis && displayPrice !== undefined && displayPrice !== null && (
              <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
                <span style={{ fontSize: 30, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                  {displayPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </span>
                <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{meta.unit}</span>
                {hoverPoint ? (
                  <>
                    <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>{displayDate}</span>
                    <Delta value={hoverDeltaPct} label="vs range start" />
                  </>
                ) : (
                  <Delta value={analysis.change1d} label="1D" />
                )}
              </div>
            )}
          </div>
          {analysis && (
            <div style={{ textAlign: "right" }}>
              <SignalBadge label={analysis.signal.label} size="lg" />
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6, maxWidth: 260 }}>
                Rule-based technical signal — not investment advice.
              </div>
            </div>
          )}
        </div>
      )}

      {analysis && (
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginTop: 18, marginBottom: 18 }}>
          <Stat label="5D" value={<Delta value={analysis.change5d} />} />
          <Stat label="1M" value={<Delta value={analysis.change1m} />} />
          <Stat label="3M" value={<Delta value={analysis.change3m} />} />
          <Stat label="1Y" value={<Delta value={analysis.change1y} />} />
          <Stat label="52W High" value={analysis["52wHigh"]} />
          <Stat label="52W Low" value={analysis["52wLow"]} />
          <Stat label="RSI (14)" value={analysis.signal.rsi} />
        </div>
      )}

      {analysis && (
        <div style={panelStyle}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>
            Why: {analysis.signal.label}
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: "var(--text-secondary)", lineHeight: 1.6 }}>
            {analysis.signal.reasons.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      )}

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "20px 0 4px" }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              ...tabButtonStyle,
              background: tab === t.key ? "var(--surface-1)" : "transparent",
              color: tab === t.key ? "var(--text-primary)" : "var(--text-secondary)",
              borderColor: tab === t.key ? "var(--border)" : "transparent",
              borderBottomColor: tab === t.key ? "var(--surface-1)" : "transparent",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ ...panelStyle, borderTopLeftRadius: 0 }}>
        {tab === "chart" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 10 }}>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {PERIODS.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => setPeriod(p.value)}
                    style={{
                      ...periodButtonStyle,
                      background: period === p.value ? "var(--series-1)" : "transparent",
                      color: period === p.value ? "#fff" : "var(--text-secondary)",
                      borderColor: period === p.value ? "var(--series-1)" : "var(--border)",
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                {history && (
                  <button
                    onClick={() => downloadSeriesCsv(`${symbol.replace("=F", "")}_${period}.csv`, history.series)}
                    style={exportButtonStyle}
                    title="Download this chart's data as CSV"
                  >
                    ⭳ CSV
                  </button>
                )}
                {compare.map((sym, i) => {
                  const c = allCommodities.find((x) => x.symbol === sym);
                  return (
                    <span key={sym} style={{ ...chipStyle, borderColor: COMPARE_COLORS[i % COMPARE_COLORS.length] }}>
                      <span style={{ width: 8, height: 8, borderRadius: 2, background: COMPARE_COLORS[i % COMPARE_COLORS.length], display: "inline-block" }} />
                      {c ? c.name : sym}
                      <button
                        onClick={() => setCompare((prev) => prev.filter((s) => s !== sym))}
                        style={chipRemoveStyle}
                        aria-label={`Remove ${c ? c.name : sym} from comparison`}
                      >
                        ×
                      </button>
                    </span>
                  );
                })}
                <ComparePicker
                  allCommodities={allCommodities}
                  excludeSymbols={[symbol, ...compare]}
                  onAdd={(sym) => setCompare((prev) => [...prev, sym])}
                  disabled={compare.length >= MAX_COMPARE}
                />
              </div>
            </div>

            {history ? (
              <div>
                {isComparing ? (
                  compareData ? (
                    <CompareChart data={compareData} seriesMeta={compareSeriesMeta} />
                  ) : (
                    <div style={{ height: 360, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
                      Loading comparison…
                    </div>
                  )
                ) : (
                  <PriceChart series={history.series} positive={periodPositive} onHover={setHoverPoint} />
                )}
                <div style={{ marginTop: 4 }}>
                  <VolumeChart series={history.series} />
                </div>
              </div>
            ) : (
              !error && <div style={{ color: "var(--text-muted)" }}>Loading chart data…</div>
            )}
          </div>
        )}

        {tab === "technicals" &&
          (history ? (
            <div>
              <SectionLabel first>RSI (14)</SectionLabel>
              <RsiChart series={history.series} />
              <SectionLabel>MACD (12, 26, 9)</SectionLabel>
              <MacdChart series={history.series} />
              <SectionLabel>Volatility (21-day, annualized)</SectionLabel>
              <VolatilityChart series={history.series} />
            </div>
          ) : (
            <div style={{ color: "var(--text-muted)" }}>Loading…</div>
          ))}

        {tab === "risk" && (
          <div>
            {history ? (
              <>
                <SectionLabel first>Drawdown from peak</SectionLabel>
                <DrawdownChart series={history.series} />
                <SectionLabel>Daily Return Distribution</SectionLabel>
                <ReturnsHistogram series={history.series} />
              </>
            ) : (
              <div style={{ color: "var(--text-muted)" }}>Loading…</div>
            )}
            <SectionLabel>Historical Backtest of the Technical Signal</SectionLabel>
            <BacktestEvidence data={backtest} />
          </div>
        )}

        {tab === "tradesetup" && (
          <TradeSetupPanel symbol={symbol} unit={meta?.unit} lastPrice={analysis?.last} />
        )}

        {tab === "seasonality" && (
          <div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>
              Cumulative % return from the start of the calendar year, day by day — this year against the
              {seasonality ? ` ${seasonality.yearsCovered}-year` : ""} historical average. Useful for agriculture and
              energy commodities with recurring annual patterns; less meaningful for instruments without seasonal
              drivers.
            </div>
            {seasonality ? (
              <SeasonalityChart series={seasonality.series} yearsCovered={seasonality.yearsCovered} />
            ) : (
              <div style={{ color: "var(--text-muted)" }}>Loading seasonality…</div>
            )}
          </div>
        )}

        {tab === "related" && (
          <div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>
              Curated stocks and ETFs with direct exposure to this commodity — producers, consumers, processors, or a
              tracking ETF. Domain knowledge, not a statistical correlation; a company's stock price reflects far
              more than just this one input.
            </div>
            {related ? <RelatedAssets items={related.items} /> : <div style={{ color: "var(--text-muted)" }}>Loading…</div>}
          </div>
        )}

        {tab === "news" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>Recent headlines</div>
              {news?.sentiment && news.sentiment.count > 0 && (
                <span
                  style={{
                    fontSize: 11.5,
                    fontWeight: 600,
                    color:
                      news.sentiment.label === "Positive"
                        ? "var(--good)"
                        : news.sentiment.label === "Negative"
                          ? "var(--critical)"
                          : "var(--text-muted)",
                  }}
                >
                  Sentiment: {news.sentiment.label}
                </span>
              )}
            </div>
            {news ? <NewsList items={news.items} /> : <div style={{ color: "var(--text-muted)" }}>Loading news…</div>}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 14, fontVariantNumeric: "tabular-nums" }}>{value ?? "—"}</div>
    </div>
  );
}

function SectionLabel({ children, first }) {
  return (
    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", margin: first ? "0 0 4px" : "16px 0 4px" }}>
      {children}
    </div>
  );
}

const backButtonStyle = {
  background: "none",
  border: "none",
  color: "var(--text-secondary)",
  fontSize: 13,
  cursor: "pointer",
  padding: 0,
};

const panelStyle = {
  background: "var(--surface-1)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: 16,
};

const tabButtonStyle = {
  border: "1px solid transparent",
  borderBottom: "1px solid transparent",
  borderTopLeftRadius: 10,
  borderTopRightRadius: 10,
  padding: "8px 16px",
  fontSize: 13,
  fontWeight: 500,
  cursor: "pointer",
  marginBottom: -1,
};

const periodButtonStyle = {
  border: "1px solid var(--border)",
  borderRadius: 999,
  padding: "4px 12px",
  fontSize: 12,
  cursor: "pointer",
};

const chipStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  border: "1px solid var(--border)",
  borderRadius: 999,
  padding: "4px 8px 4px 10px",
  fontSize: 12,
  color: "var(--text-secondary)",
};

const exportButtonStyle = {
  border: "1px solid var(--border)",
  borderRadius: 999,
  padding: "4px 12px",
  fontSize: 12,
  color: "var(--text-secondary)",
  background: "transparent",
  cursor: "pointer",
};

const chipRemoveStyle = {
  border: "none",
  background: "none",
  color: "var(--text-muted)",
  cursor: "pointer",
  fontSize: 14,
  lineHeight: 1,
  padding: "0 0 0 2px",
};

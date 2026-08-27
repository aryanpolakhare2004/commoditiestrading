export function downloadSeriesCsv(filename, series) {
  if (!series || series.length === 0) return;
  const columns = ["date", "open", "high", "low", "close", "volume", "sma20", "sma50", "sma200", "rsi", "macd", "macdSignal", "macdHist", "volatility"];
  const rows = [columns.join(",")];
  for (const row of series) {
    rows.push(columns.map((c) => (row[c] === null || row[c] === undefined ? "" : row[c])).join(","));
  }
  const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

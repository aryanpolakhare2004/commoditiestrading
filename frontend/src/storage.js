const WATCHLIST_KEY = "commodities.watchlist";
const ALERTS_KEY = "commodities.alerts";
const JOURNAL_KEY = "commodities.journal";

function safeParse(json, fallback) {
  try {
    const v = JSON.parse(json);
    return v ?? fallback;
  } catch {
    return fallback;
  }
}

export function loadWatchlist() {
  try {
    return safeParse(localStorage.getItem(WATCHLIST_KEY), []);
  } catch {
    return [];
  }
}

export function saveWatchlist(list) {
  try {
    localStorage.setItem(WATCHLIST_KEY, JSON.stringify(list));
  } catch {
    // localStorage unavailable (private browsing, blocked site data) — watchlist just won't persist.
  }
}

export function loadAlerts() {
  try {
    return safeParse(localStorage.getItem(ALERTS_KEY), []);
  } catch {
    return [];
  }
}

export function saveAlerts(list) {
  try {
    localStorage.setItem(ALERTS_KEY, JSON.stringify(list));
  } catch {
    // ditto
  }
}

export const ALERT_TYPES = {
  price_above: { label: "Price at or above", format: (v, unit) => `${v} ${unit}` },
  price_below: { label: "Price at or below", format: (v, unit) => `${v} ${unit}` },
  change_above: { label: "1D change at or above", format: (v) => `+${v}%` },
  change_below: { label: "1D change at or below", format: (v) => `${v}%` },
};

export function loadJournal() {
  try {
    return safeParse(localStorage.getItem(JOURNAL_KEY), []);
  } catch {
    return [];
  }
}

export function saveJournal(list) {
  try {
    localStorage.setItem(JOURNAL_KEY, JSON.stringify(list));
  } catch {
    // ditto
  }
}

export function isAlertTriggered(alert, commodity) {
  if (!commodity || !commodity.available) return false;
  switch (alert.type) {
    case "price_above":
      return commodity.last >= alert.threshold;
    case "price_below":
      return commodity.last <= alert.threshold;
    case "change_above":
      return (commodity.change1d ?? -Infinity) >= alert.threshold;
    case "change_below":
      return (commodity.change1d ?? Infinity) <= alert.threshold;
    default:
      return false;
  }
}

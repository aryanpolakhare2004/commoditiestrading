"""Expected-value opportunity ranking.

EV = P(win) x Upside - P(loss) x Downside, using REAL historical statistics
from backend/backtest.py for whichever setup — bullish or bearish — matches
the instrument's current technical score. This is not a forecast: it
answers "if today's setup behaved like its own history, what would that
have looked like," nothing more. A thin sample size is penalized, not
hidden, via the confidence adjustment below.
"""

import relationships


def _confidence_adjustment(sample_size: int | None) -> float:
    if not sample_size:
        return -2.0
    if sample_size >= 100:
        return 1.0
    if sample_size >= 30:
        return 0.0
    return -2.0


def _volatility_penalty(volatility_z: float | None) -> float:
    if volatility_z is None or volatility_z <= 0:
        return 0.0
    return round(min(volatility_z, 3.0), 2)  # up to -3 points at 3-sigma elevated volatility


def liquidity_percentile(symbol: str, dollar_volume_by_symbol: dict) -> float | None:
    values = sorted(v for v in dollar_volume_by_symbol.values() if v is not None)
    v = dollar_volume_by_symbol.get(symbol)
    if v is None or not values:
        return None
    rank = sum(1 for x in values if x <= v)
    return rank / len(values)


def _liquidity_penalty(percentile: float | None) -> float:
    if percentile is None:
        return 0.0
    if percentile < 0.2:
        return 1.5
    if percentile < 0.4:
        return 0.5
    return 0.0


def build_opportunity(meta: dict, backtest: dict, signal_result: dict, dollar_volume_pct: float | None,
                       related_correlation: list, recent_events: list) -> dict:
    current_score = backtest.get("currentScore")
    is_bullish = (current_score or 0) >= 0
    setup = backtest.get("bullishSetup") if is_bullish else backtest.get("bearishSetup")

    ev = None
    p_win = None
    if setup and setup["sampleSize"] > 0:
        p_win = setup["winRate"] / 100
        upside = setup["avgWin"]
        downside = abs(setup["avgLoss"])
        ev = round(p_win * upside - (1 - p_win) * downside, 2)

    conf_adj = _confidence_adjustment(setup["sampleSize"] if setup else None)
    vol_pen = _volatility_penalty(signal_result["components"].get("volatility"))
    liq_pen = _liquidity_penalty(dollar_volume_pct)

    opportunity_score = round(ev + conf_adj - vol_pen - liq_pen, 2) if ev is not None else None

    symbol = meta["symbol"]
    return {
        "symbol": symbol,
        "name": meta["name"],
        "sector": meta["sector"],
        "unit": meta["unit"],
        "direction": "bullish" if is_bullish else "bearish",
        "currentScore": current_score,
        "ev": {
            "winProbability": None if p_win is None else round(p_win * 100, 1),
            "upside": setup["avgWin"] if setup else None,
            "downside": None if not setup else round(abs(setup["avgLoss"]), 2),
            "expectedValue": ev,
            "sampleSize": setup["sampleSize"] if setup else 0,
            "forwardDays": backtest.get("forwardDays"),
        },
        "adjustments": {
            "confidence": conf_adj,
            "volatilityPenalty": -vol_pen,
            "liquidityPenalty": -liq_pen,
        },
        "opportunityScore": opportunity_score,
        "signals": signal_result,
        "relatedComplex": relationships.complex_peers(symbol),
        "relatedCrossLinks": relationships.cross_links_for(symbol),
        "relatedByCorrelation": related_correlation,
        "recentEvents": recent_events,
    }

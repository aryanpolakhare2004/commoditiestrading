"""Futures contract specifications for position sizing.

Reference data, not a live feed — exchanges do occasionally revise contract
size, tick size, and (especially) margin, and a couple of these (aluminum,
milk, lumber, rough rice — newer or thinner-traded contracts) are lower
confidence than the long-standing majors. `confidence: "verify"` flags those.
Every value here should be treated as a starting point, not ground truth —
always confirm against your broker or the exchange (CME/ICE) before sizing a
real position.

tickValue = tickSize * contractSize (both in the contract's own units).
"""

SPECS = {
    "CL=F": {"contractSize": 1000, "unit": "bbl", "tickSize": 0.01, "tickValue": 10.0, "confidence": "high"},
    "BZ=F": {"contractSize": 1000, "unit": "bbl", "tickSize": 0.01, "tickValue": 10.0, "confidence": "high"},
    "NG=F": {"contractSize": 10000, "unit": "MMBtu", "tickSize": 0.001, "tickValue": 10.0, "confidence": "high"},
    "RB=F": {"contractSize": 42000, "unit": "gal", "tickSize": 0.0001, "tickValue": 4.20, "confidence": "high"},
    "HO=F": {"contractSize": 42000, "unit": "gal", "tickSize": 0.0001, "tickValue": 4.20, "confidence": "high"},
    "GC=F": {"contractSize": 100, "unit": "troy oz", "tickSize": 0.10, "tickValue": 10.0, "confidence": "high"},
    "SI=F": {"contractSize": 5000, "unit": "troy oz", "tickSize": 0.005, "tickValue": 25.0, "confidence": "high"},
    "HG=F": {"contractSize": 25000, "unit": "lb", "tickSize": 0.0005, "tickValue": 12.50, "confidence": "high"},
    "PL=F": {"contractSize": 50, "unit": "troy oz", "tickSize": 0.10, "tickValue": 5.0, "confidence": "high"},
    "PA=F": {"contractSize": 100, "unit": "troy oz", "tickSize": 0.10, "tickValue": 10.0, "confidence": "high"},
    "ALI=F": {"contractSize": 25, "unit": "metric ton", "tickSize": 0.25, "tickValue": 6.25, "confidence": "verify"},
    "ZC=F": {"contractSize": 5000, "unit": "bu", "tickSize": 0.0025, "tickValue": 12.50, "confidence": "high"},
    "ZW=F": {"contractSize": 5000, "unit": "bu", "tickSize": 0.0025, "tickValue": 12.50, "confidence": "high"},
    "ZS=F": {"contractSize": 5000, "unit": "bu", "tickSize": 0.0025, "tickValue": 12.50, "confidence": "high"},
    "KC=F": {"contractSize": 37500, "unit": "lb", "tickSize": 0.0005, "tickValue": 18.75, "confidence": "high"},
    "SB=F": {"contractSize": 112000, "unit": "lb", "tickSize": 0.0001, "tickValue": 11.20, "confidence": "high"},
    "CT=F": {"contractSize": 50000, "unit": "lb", "tickSize": 0.0001, "tickValue": 5.0, "confidence": "high"},
    "CC=F": {"contractSize": 10, "unit": "metric ton", "tickSize": 1.0, "tickValue": 10.0, "confidence": "high"},
    "OJ=F": {"contractSize": 15000, "unit": "lb", "tickSize": 0.0005, "tickValue": 7.50, "confidence": "high"},
    "ZO=F": {"contractSize": 5000, "unit": "bu", "tickSize": 0.0025, "tickValue": 12.50, "confidence": "high"},
    "ZR=F": {"contractSize": 2000, "unit": "cwt", "tickSize": 0.005, "tickValue": 10.0, "confidence": "verify"},
    "ZM=F": {"contractSize": 100, "unit": "short ton", "tickSize": 0.10, "tickValue": 10.0, "confidence": "high"},
    "ZL=F": {"contractSize": 60000, "unit": "lb", "tickSize": 0.0001, "tickValue": 6.0, "confidence": "high"},
    "DC=F": {"contractSize": 200000, "unit": "lb", "tickSize": 0.0001, "tickValue": 20.0, "confidence": "verify"},
    "LE=F": {"contractSize": 40000, "unit": "lb", "tickSize": 0.00025, "tickValue": 10.0, "confidence": "high"},
    "GF=F": {"contractSize": 50000, "unit": "lb", "tickSize": 0.00025, "tickValue": 12.50, "confidence": "high"},
    "HE=F": {"contractSize": 40000, "unit": "lb", "tickSize": 0.00025, "tickValue": 10.0, "confidence": "high"},
    "LBR=F": {"contractSize": 110000, "unit": "board ft", "tickSize": 0.10, "tickValue": 11.0, "confidence": "verify"},
}


def position_size(symbol: str, account_size: float, risk_pct: float, entry: float, stop: float) -> dict | None:
    spec = SPECS.get(symbol)
    if not spec or entry == stop:
        return None

    dollar_risk_budget = account_size * (risk_pct / 100)
    price_risk_per_unit = abs(entry - stop)
    risk_per_contract = price_risk_per_unit * spec["contractSize"]

    if risk_per_contract == 0:
        return None

    contracts_exact = dollar_risk_budget / risk_per_contract
    contracts = max(0, int(contracts_exact))  # round down — never risk more than budgeted
    actual_dollar_risk = contracts * risk_per_contract

    return {
        "symbol": symbol,
        "spec": spec,
        "dollarRiskBudget": round(dollar_risk_budget, 2),
        "priceRiskPerUnit": round(price_risk_per_unit, 4),
        "riskPerContract": round(risk_per_contract, 2),
        "contractsExact": round(contracts_exact, 2),
        "contracts": contracts,
        "actualDollarRisk": round(actual_dollar_risk, 2),
        "notionalValue": round(entry * spec["contractSize"] * max(contracts, 1), 2),
    }

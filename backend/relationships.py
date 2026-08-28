"""Asset relationship graph for commodities.

Two independent sources, kept separate so it's clear which is which:

- COMPLEXES / CROSS_LINKS: curated domain knowledge (which futures share a
  supply chain or trade the same underlying economics) — a human judgment
  call, not derived from data.
- related_via_correlation(): a statistical fact computed from real daily
  returns — which commodities have actually been moving together recently.

A commodity showing up in both is a stronger signal than either alone.
"""

COMPLEXES = {
    "Energy": ["CL=F", "BZ=F", "NG=F", "RB=F", "HO=F"],
    "Precious Metals": ["GC=F", "SI=F", "PL=F", "PA=F"],
    "Base Metals": ["HG=F", "ALI=F"],
    "Grains": ["ZC=F", "ZW=F", "ZO=F", "ZR=F"],
    "Oilseed Complex": ["ZS=F", "ZM=F", "ZL=F"],
    "Softs": ["KC=F", "SB=F", "CT=F", "CC=F", "OJ=F"],
    "Livestock": ["LE=F", "GF=F", "HE=F"],
}

SYMBOL_TO_COMPLEX = {sym: name for name, syms in COMPLEXES.items() for sym in syms}

# Notable cross-complex economic links worth surfacing even when correlation
# is currently weak — e.g. corn is a feed-cost input for cattle regardless of
# whether their prices happen to be correlated this quarter.
CROSS_LINKS = [
    {"from": "ZC=F", "to": "LE=F", "reason": "Corn is a primary feed-cost input for cattle"},
    {"from": "ZC=F", "to": "HE=F", "reason": "Corn is a primary feed-cost input for hogs"},
    {"from": "ZC=F", "to": "GF=F", "reason": "Corn is a primary feed-cost input for feeder cattle"},
    {"from": "ZS=F", "to": "ZM=F", "reason": "Soybean crush spread: meal is a soybean processing output"},
    {"from": "ZS=F", "to": "ZL=F", "reason": "Soybean crush spread: oil is a soybean processing output"},
    {"from": "CL=F", "to": "ZL=F", "reason": "Crude oil sets the economics of biodiesel demand for soybean oil"},
    {"from": "NG=F", "to": "ZC=F", "reason": "Natural gas is the main feedstock cost for nitrogen fertilizer used on corn"},
    {"from": "CL=F", "to": "RB=F", "reason": "RBOB is refined from crude oil"},
    {"from": "CL=F", "to": "HO=F", "reason": "Heating oil is refined from crude oil"},
    {"from": "GC=F", "to": "SI=F", "reason": "Gold and silver trade as a precious-metals pair"},
]


def complex_peers(symbol: str) -> list[str]:
    complex_name = SYMBOL_TO_COMPLEX.get(symbol)
    if not complex_name:
        return []
    return [s for s in COMPLEXES[complex_name] if s != symbol]


def cross_links_for(symbol: str) -> list[dict]:
    out = []
    for link in CROSS_LINKS:
        if link["from"] == symbol:
            out.append({"symbol": link["to"], "reason": link["reason"], "direction": "affects"})
        elif link["to"] == symbol:
            out.append({"symbol": link["from"], "reason": link["reason"], "direction": "affected_by"})
    return out


def related_via_correlation(symbol: str, corr_by_symbol: dict, threshold: float = 0.5, limit: int = 5) -> list[dict]:
    """corr_by_symbol: {other_symbol: correlation_value} for `symbol` against
    every other tracked commodity, over whatever window the caller computed."""
    pairs = [
        {"symbol": s, "correlation": round(v, 2)}
        for s, v in corr_by_symbol.items()
        if s != symbol and v is not None and abs(v) >= threshold
    ]
    pairs.sort(key=lambda p: abs(p["correlation"]), reverse=True)
    return pairs[:limit]

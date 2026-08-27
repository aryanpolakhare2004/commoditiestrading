"""Registry of tradable commodity futures covered by the dashboard."""

COMMODITIES = [
    # Energy
    {"symbol": "CL=F", "name": "Crude Oil (WTI)", "sector": "Energy", "unit": "USD/bbl"},
    {"symbol": "BZ=F", "name": "Crude Oil (Brent)", "sector": "Energy", "unit": "USD/bbl"},
    {"symbol": "NG=F", "name": "Natural Gas", "sector": "Energy", "unit": "USD/MMBtu"},
    {"symbol": "RB=F", "name": "Gasoline (RBOB)", "sector": "Energy", "unit": "USD/gal"},
    {"symbol": "HO=F", "name": "Heating Oil", "sector": "Energy", "unit": "USD/gal"},
    # Metals
    {"symbol": "GC=F", "name": "Gold", "sector": "Metals", "unit": "USD/oz"},
    {"symbol": "SI=F", "name": "Silver", "sector": "Metals", "unit": "USD/oz"},
    {"symbol": "HG=F", "name": "Copper", "sector": "Metals", "unit": "USD/lb"},
    {"symbol": "PL=F", "name": "Platinum", "sector": "Metals", "unit": "USD/oz"},
    {"symbol": "PA=F", "name": "Palladium", "sector": "Metals", "unit": "USD/oz"},
    # Agriculture
    {"symbol": "ZC=F", "name": "Corn", "sector": "Agriculture", "unit": "USD/bu"},
    {"symbol": "ZW=F", "name": "Wheat", "sector": "Agriculture", "unit": "USD/bu"},
    {"symbol": "ZS=F", "name": "Soybeans", "sector": "Agriculture", "unit": "USD/bu"},
    {"symbol": "KC=F", "name": "Coffee", "sector": "Agriculture", "unit": "USD/lb"},
    {"symbol": "SB=F", "name": "Sugar", "sector": "Agriculture", "unit": "USD/lb"},
    {"symbol": "CT=F", "name": "Cotton", "sector": "Agriculture", "unit": "USD/lb"},
]

BY_SYMBOL = {c["symbol"]: c for c in COMMODITIES}

SECTORS = sorted({c["sector"] for c in COMMODITIES})

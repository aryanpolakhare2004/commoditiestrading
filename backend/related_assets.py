"""Curated stocks and ETFs with direct exposure to each commodity.

Hand-picked domain knowledge, not derived from data — kept separate from the
correlation-based relationships in relationships.py for the same reason:
this is a human judgment call about producers, consumers, and processors,
not a statistical fact. Every ticker here was checked against Yahoo Finance
before being added; a handful of commodity ETNs that would otherwise be the
obvious pick (BAL for cotton, NIB for cocoa, JO for coffee) have since been
delisted and were swapped for equity alternatives instead, and a couple of
other tempting picks (K/Kellanova, PCH/PotlatchDeltic) turned out to be
delisted too (M&A) and were left out rather than shipped broken.
"""

RELATED = {
    # Energy
    "CL=F": [
        {"symbol": "XOM", "name": "ExxonMobil", "type": "producer"},
        {"symbol": "CVX", "name": "Chevron", "type": "producer"},
        {"symbol": "COP", "name": "ConocoPhillips", "type": "producer"},
        {"symbol": "SLB", "name": "Schlumberger", "type": "services"},
        {"symbol": "USO", "name": "United States Oil Fund", "type": "etf"},
    ],
    "BZ=F": [
        {"symbol": "BP", "name": "BP", "type": "producer"},
        {"symbol": "SHEL", "name": "Shell", "type": "producer"},
        {"symbol": "TTE", "name": "TotalEnergies", "type": "producer"},
        {"symbol": "USO", "name": "United States Oil Fund", "type": "etf"},
    ],
    "NG=F": [
        {"symbol": "EQT", "name": "EQT Corp", "type": "producer"},
        {"symbol": "AR", "name": "Antero Resources", "type": "producer"},
        {"symbol": "RRC", "name": "Range Resources", "type": "producer"},
        {"symbol": "UNG", "name": "United States Natural Gas Fund", "type": "etf"},
    ],
    "RB=F": [
        {"symbol": "VLO", "name": "Valero Energy", "type": "refiner"},
        {"symbol": "MPC", "name": "Marathon Petroleum", "type": "refiner"},
        {"symbol": "PSX", "name": "Phillips 66", "type": "refiner"},
        {"symbol": "UGA", "name": "United States Gasoline Fund", "type": "etf"},
    ],
    "HO=F": [
        {"symbol": "PSX", "name": "Phillips 66", "type": "refiner"},
        {"symbol": "VLO", "name": "Valero Energy", "type": "refiner"},
        {"symbol": "MPC", "name": "Marathon Petroleum", "type": "refiner"},
    ],
    # Metals
    "GC=F": [
        {"symbol": "NEM", "name": "Newmont", "type": "producer"},
        {"symbol": "GOLD", "name": "Barrick Gold", "type": "producer"},
        {"symbol": "AEM", "name": "Agnico Eagle Mines", "type": "producer"},
        {"symbol": "GLD", "name": "SPDR Gold Shares", "type": "etf"},
    ],
    "SI=F": [
        {"symbol": "PAAS", "name": "Pan American Silver", "type": "producer"},
        {"symbol": "AG", "name": "First Majestic Silver", "type": "producer"},
        {"symbol": "WPM", "name": "Wheaton Precious Metals", "type": "streamer"},
        {"symbol": "SLV", "name": "iShares Silver Trust", "type": "etf"},
    ],
    "HG=F": [
        {"symbol": "FCX", "name": "Freeport-McMoRan", "type": "producer"},
        {"symbol": "SCCO", "name": "Southern Copper", "type": "producer"},
        {"symbol": "TECK", "name": "Teck Resources", "type": "producer"},
        {"symbol": "CPER", "name": "United States Copper Index Fund", "type": "etf"},
    ],
    "PL=F": [
        {"symbol": "SBSW", "name": "Sibanye Stillwater", "type": "producer"},
        {"symbol": "PPLT", "name": "abrdn Physical Platinum Shares", "type": "etf"},
    ],
    "PA=F": [
        {"symbol": "SBSW", "name": "Sibanye Stillwater", "type": "producer"},
        {"symbol": "PALL", "name": "abrdn Physical Palladium Shares", "type": "etf"},
    ],
    "ALI=F": [
        {"symbol": "AA", "name": "Alcoa", "type": "producer"},
        {"symbol": "CENX", "name": "Century Aluminum", "type": "producer"},
    ],
    # Agriculture
    "ZC=F": [
        {"symbol": "ADM", "name": "Archer-Daniels-Midland", "type": "processor"},
        {"symbol": "BG", "name": "Bunge Global", "type": "processor"},
        {"symbol": "CF", "name": "CF Industries", "type": "input_cost"},
        {"symbol": "CORN", "name": "Teucrium Corn Fund", "type": "etf"},
    ],
    "ZW=F": [
        {"symbol": "ADM", "name": "Archer-Daniels-Midland", "type": "processor"},
        {"symbol": "BG", "name": "Bunge Global", "type": "processor"},
        {"symbol": "WEAT", "name": "Teucrium Wheat Fund", "type": "etf"},
    ],
    "ZS=F": [
        {"symbol": "ADM", "name": "Archer-Daniels-Midland", "type": "processor"},
        {"symbol": "BG", "name": "Bunge Global", "type": "processor"},
        {"symbol": "MOS", "name": "The Mosaic Company", "type": "input_cost"},
        {"symbol": "SOYB", "name": "Teucrium Soybean Fund", "type": "etf"},
    ],
    "ZM=F": [
        {"symbol": "ADM", "name": "Archer-Daniels-Midland", "type": "processor"},
        {"symbol": "BG", "name": "Bunge Global", "type": "processor"},
    ],
    "ZL=F": [
        {"symbol": "ADM", "name": "Archer-Daniels-Midland", "type": "processor"},
        {"symbol": "BG", "name": "Bunge Global", "type": "processor"},
    ],
    "KC=F": [
        {"symbol": "SBUX", "name": "Starbucks", "type": "consumer"},
        {"symbol": "JVA", "name": "Coffee Holding Co", "type": "processor"},
    ],
    "SB=F": [
        {"symbol": "PEP", "name": "PepsiCo", "type": "consumer"},
        {"symbol": "CANE", "name": "Teucrium Sugar Fund", "type": "etf"},
    ],
    "CT=F": [
        {"symbol": "LEVI", "name": "Levi Strauss & Co.", "type": "consumer"},
        {"symbol": "GIL", "name": "Gildan Activewear", "type": "consumer"},
    ],
    "CC=F": [
        {"symbol": "HSY", "name": "The Hershey Company", "type": "consumer"},
        {"symbol": "MDLZ", "name": "Mondelez International", "type": "consumer"},
    ],
    "OJ=F": [
        {"symbol": "KO", "name": "Coca-Cola (Minute Maid/Simply)", "type": "consumer"},
    ],
    "ZO=F": [
        {"symbol": "GIS", "name": "General Mills", "type": "consumer"},
        {"symbol": "DBA", "name": "Invesco DB Agriculture Fund", "type": "etf"},
    ],
    "ZR=F": [
        {"symbol": "DBA", "name": "Invesco DB Agriculture Fund", "type": "etf"},
    ],
    "DC=F": [
        {"symbol": "DBA", "name": "Invesco DB Agriculture Fund", "type": "etf"},
    ],
    # Livestock
    "LE=F": [
        {"symbol": "TSN", "name": "Tyson Foods", "type": "processor"},
    ],
    "GF=F": [
        {"symbol": "TSN", "name": "Tyson Foods", "type": "processor"},
    ],
    "HE=F": [
        {"symbol": "TSN", "name": "Tyson Foods", "type": "processor"},
        {"symbol": "HRL", "name": "Hormel Foods", "type": "processor"},
    ],
    # Materials
    "LBR=F": [
        {"symbol": "WY", "name": "Weyerhaeuser", "type": "producer"},
        {"symbol": "IP", "name": "International Paper", "type": "producer"},
        {"symbol": "RYN", "name": "Rayonier", "type": "producer"},
        {"symbol": "WOOD", "name": "iShares Global Timber & Forestry ETF", "type": "etf"},
    ],
}


def related_for(symbol: str) -> list[dict]:
    return RELATED.get(symbol, [])

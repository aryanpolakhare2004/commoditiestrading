"""Recurring scheduled catalysts for these specific commodity markets.

Computed from known, publicly-published release schedules, not fetched live
— exchanges and agencies occasionally shift a date around a holiday, and
monthly reports (WASDE, Cattle on Feed) move around within the month rather
than landing on a fixed day. Treat dates within the next ~10 days as
reliable and anything further out as indicative; always check the source
agency's own calendar (eia.gov, usda.gov, cftc.gov) before treating a date
as fixed.
"""

from datetime import datetime, timedelta

WEEKDAY = {"mon": 0, "tue": 1, "wed": 2, "thu": 3, "fri": 4, "sat": 5, "sun": 6}

WEEKLY_EVENTS = [
    {
        "name": "EIA Weekly Petroleum Status Report",
        "weekday": "wed",
        "time": "10:30 ET",
        "affected": ["CL=F", "BZ=F", "RB=F", "HO=F"],
        "source": "eia.gov",
    },
    {
        "name": "EIA Weekly Natural Gas Storage Report",
        "weekday": "thu",
        "time": "10:30 ET",
        "affected": ["NG=F"],
        "source": "eia.gov",
    },
    {
        "name": "CFTC Commitments of Traders (as of prior Tuesday)",
        "weekday": "fri",
        "time": "15:30 ET",
        "affected": "all",
        "source": "cftc.gov",
    },
]

# Monthly events approximated to a day-of-month window; USDA/NOPA move the
# exact date around within a few days, so these are indicative, not exact.
MONTHLY_EVENTS = [
    {
        "name": "USDA WASDE (World Agricultural Supply & Demand Estimates)",
        "approxDay": 12,
        "affected": ["ZC=F", "ZW=F", "ZS=F", "ZM=F", "ZL=F", "ZO=F", "ZR=F", "CT=F", "SB=F"],
        "source": "usda.gov",
    },
    {
        "name": "USDA Cattle on Feed",
        "approxDay": 22,  # third Friday, approximated
        "affected": ["LE=F", "GF=F"],
        "source": "usda.gov",
    },
    {
        "name": "NOPA Soybean Crush Report",
        "approxDay": 15,
        "affected": ["ZS=F", "ZM=F", "ZL=F"],
        "source": "soya.org (NOPA)",
    },
]


def _next_weekday(from_date, weekday_name: str):
    target = WEEKDAY[weekday_name]
    days_ahead = (target - from_date.weekday()) % 7
    days_ahead = days_ahead or 7  # always the *next* occurrence, not today
    return from_date + timedelta(days=days_ahead)


def upcoming_events(days_ahead: int = 21) -> list[dict]:
    today = datetime.utcnow().date()
    horizon = today + timedelta(days=days_ahead)
    out = []

    for ev in WEEKLY_EVENTS:
        d = _next_weekday(today, ev["weekday"])
        while d <= horizon:
            out.append({
                "name": ev["name"], "date": d.strftime("%Y-%m-%d"), "time": ev["time"],
                "affected": ev["affected"], "source": ev["source"], "frequency": "weekly",
            })
            d += timedelta(days=7)

    for ev in MONTHLY_EVENTS:
        for month_offset in (0, 1):
            year = today.year + (today.month - 1 + month_offset) // 12
            month = (today.month - 1 + month_offset) % 12 + 1
            try:
                d = datetime(year, month, ev["approxDay"]).date()
            except ValueError:
                continue
            if today <= d <= horizon:
                out.append({
                    "name": ev["name"], "date": d.strftime("%Y-%m-%d"), "time": None,
                    "affected": ev["affected"], "source": ev["source"], "frequency": "monthly (approximate)",
                })

    out.sort(key=lambda e: e["date"])
    return out

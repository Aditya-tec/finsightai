from __future__ import annotations


def classify_query(query: str) -> str:
    q = query.lower()
    if "report" in q or "analyst" in q:
        return "FULL_REPORT"
    if any(x in q for x in ["fy27", "forecast", "outlook", "expected"]):
        return "PROJECTION"
    if any(x in q for x in ["latest", "now", "current", "recent"]):
        return "CURRENT"
    return "HISTORICAL"

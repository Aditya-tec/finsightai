from __future__ import annotations

import re

from routers.companies import NIFTY20

_TICKER_SET = {c["ticker"].upper() for c in NIFTY20}
_NAME_TO_TICKER = {c["name"].lower(): c["ticker"] for c in NIFTY20}
# Common aliases
_ALIASES = {
    "infosys": "INFY",
    "reliance": "RELIANCE",
    "tcs": "TCS",
    "hdfc": "HDFCBANK",
    "icici": "ICICIBANK",
    "sbi": "SBIN",
    "wipro": "WIPRO",
    "maruti": "MARUTI",
    "tata motors": "TATAMOTORS",
    "sun pharma": "SUNPHARMA",
    "bharti": "BHARTIARTL",
    "airtel": "BHARTIARTL",
    "nestle": "NESTLEIND",
    "axis": "AXISBANK",
    "kotak": "KOTAKBANK",
    "asian paints": "ASIANPAINT",
    "bajaj finance": "BAJFINANCE",
    "hcl": "HCLTECH",
    "l&t": "LT",
    "larsen": "LT",
    "titan": "TITAN",
    "itc": "ITC",
}

_COMPARE_MARKERS = ("compare", "versus", " vs ", " vs.", "between", "difference")


def is_comparative_query(query: str) -> bool:
    q = query.lower()
    return any(m in q for m in _COMPARE_MARKERS)


def parse_tickers_from_query(query: str, explicit: list[str] | None = None) -> list[str]:
    found: list[str] = []
    seen: set[str] = set()

    def add(t: str) -> None:
        t = t.upper()
        if t in _TICKER_SET and t not in seen:
            seen.add(t)
            found.append(t)

    if explicit:
        for t in explicit:
            add(t)

    q_upper = query.upper()
    for ticker in _TICKER_SET:
        if re.search(rf"\b{re.escape(ticker)}\b", q_upper):
            add(ticker)

    q_lower = query.lower()
    for name, ticker in _NAME_TO_TICKER.items():
        if name in q_lower:
            add(ticker)
    for alias, ticker in _ALIASES.items():
        if re.search(rf"\b{re.escape(alias)}\b", q_lower):
            add(ticker)

    return found[:3]

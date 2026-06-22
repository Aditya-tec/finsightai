"""
Best-effort BSE annual report URL resolver.
Outputs suggested entries for scripts/bse_report_urls.json — review before downloading.
"""
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

import httpx

BSE_CORP_URL = "https://www.bseindia.com/stock-share-price/{slug}/{ticker}/{bse_code}/corp-announcements/"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--companies", default="scripts/nifty20_companies.json")
    parser.add_argument("--output", default="scripts/bse_report_urls.json")
    parser.add_argument("--ticker", default="")
    args = parser.parse_args()

    companies = json.loads(Path(args.companies).read_text(encoding="utf-8"))
    if args.ticker:
        companies = [c for c in companies if c["ticker"] == args.ticker.upper()]

    results = []
    for company in companies:
        ticker = company["ticker"]
        bse_code = company.get("bse_code", "")
        entry = {"ticker": ticker, "fiscal_year": "FY25", "pdf_url": "", "bse_code": bse_code}
        print(f"{ticker}: add direct PDF URL manually or scrape BSE corp filings for code {bse_code}")
        results.append(entry)

    out = Path(args.output)
    existing = {e["ticker"]: e for e in json.loads(out.read_text(encoding="utf-8"))} if out.is_file() else {}
    for entry in results:
        if entry["ticker"] not in existing or not existing[entry["ticker"]].get("pdf_url"):
            existing[entry["ticker"]] = {**existing.get(entry["ticker"], {}), **entry}
    out.write_text(json.dumps(list(existing.values()), indent=2), encoding="utf-8")
    print(f"Wrote template -> {out}")


if __name__ == "__main__":
    main()

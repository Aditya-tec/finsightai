"""
Regenerate chart sections (02 Business, 03 Financial) for selected tickers.

Patches v7-charts cache in place — other 9 sections preserved.
Requires GROQ_API_KEY. Run: python scripts/regen_chart_sections.py --tickers AXISBANK,WIPRO,MARUTI,SUNPHARMA
"""
from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from groq import RateLimitError

from agents.chart_data import CHART_SECTIONS, SECTION_BUSINESS, SECTION_FINANCIAL
from agents.report_agent import (
    CHART_TARGETED_LIMIT,
    _chart_targeted_query,
    _merge_chart_context,
    _rank_chunks,
    _write_section_with_chart,
)
from rag.hybrid_search import hybrid_retrieve
from agents.report_section_parse import parse_section_json

CACHE_DIR = ROOT / "backend" / "data" / "report_cache" / "v7-charts"
SECTION_MAP = {
    "business": SECTION_BUSINESS,
    "financial": SECTION_FINANCIAL,
}


def regen_ticker(ticker: str, sections_filter: list[str], dry_run: bool) -> None:
    path = CACHE_DIR / f"{ticker.upper()}.json"
    if not path.is_file():
        print(f"  No cache: {path.name}")
        return

    data = json.loads(path.read_text(encoding="utf-8"))
    pool = hybrid_retrieve(
        f"{ticker} annual report revenue profit segments consolidated FY25 FY24",
        ticker=ticker,
        limit=20,
    )

    for section in data.get("sections", []):
        title = section.get("title", "")
        key = None
        for k, v in SECTION_MAP.items():
            if v == title and (not sections_filter or k in sections_filter):
                key = k
                break
        if not key:
            continue

        query = _chart_targeted_query(title, ticker) or title
        section_context = _rank_chunks(pool, query)
        targeted = hybrid_retrieve(query, ticker=ticker, limit=CHART_TARGETED_LIMIT) if query else []
        chart_context = _merge_chart_context(section_context, targeted)

        print(f"  Regenerating {ticker} / {title}...")
        if dry_run:
            continue

        try:
            body, chart_data = _write_section_with_chart(title, ticker, chart_context)
        except RateLimitError:
            print(f"  Rate limit — stop and retry later")
            raise

        section["body"] = body
        section["chart_data"] = chart_data
        status = "HAS_CHART" if chart_data else "null"
        print(f"    -> chart_data: {status}")

    if not dry_run:
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"  Saved {path.name}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--tickers",
        default="AXISBANK,WIPRO,MARUTI,SUNPHARMA",
        help="Comma-separated tickers",
    )
    parser.add_argument("--sections", default="business,financial")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--delay", type=float, default=3.0)
    args = parser.parse_args()

    tickers = [t.strip().upper() for t in args.tickers.split(",") if t.strip()]
    sections_filter = [s.strip().lower() for s in args.sections.split(",") if s.strip()]

    for i, ticker in enumerate(tickers):
        print(f"[{i + 1}/{len(tickers)}] {ticker}")
        try:
            regen_ticker(ticker, sections_filter, args.dry_run)
        except RateLimitError:
            break
        if i < len(tickers) - 1:
            time.sleep(args.delay)


if __name__ == "__main__":
    main()

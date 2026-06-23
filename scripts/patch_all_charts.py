"""
Patch Sec 02/03 charts in v7-charts cache using deterministic extraction from parsed filings
and section prose fallback. Does not clear existing valid charts when re-extraction fails.
Run from repo root: python scripts/patch_all_charts.py
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from agents.chart_data import CHART_SECTIONS, SECTION_BUSINESS, SECTION_FINANCIAL, validate_chart_data
from agents.chart_extract import _bar_sane, extract_chart_for_section

CACHE_DIR = ROOT / "backend" / "data" / "report_cache" / "v7-charts"


def _financial_chart_sane(chart: dict | None) -> bool:
    if not chart or chart.get("type") != "bar":
        return False
    try:
        rev = chart["datasets"][0]["values"]
        pat = chart["datasets"][1]["values"]
    except (KeyError, IndexError, TypeError):
        return False
    return _bar_sane(rev, pat) and max(rev) >= 500


def main() -> int:
    if not CACHE_DIR.is_dir():
        print(f"Cache dir not found: {CACHE_DIR}")
        return 1

    patched = 0
    for path in sorted(CACHE_DIR.glob("*.json")):
        ticker = path.stem.upper()
        data = json.loads(path.read_text(encoding="utf-8"))
        changes: list[str] = []

        for section in data.get("sections", []):
            title = section.get("title", "")
            if title not in CHART_SECTIONS:
                continue
            body = section.get("body", "")
            existing = section.get("chart_data")
            existing_ok = existing and validate_chart_data(title, existing)
            if title == SECTION_FINANCIAL and existing_ok and not _financial_chart_sane(existing):
                existing_ok = False

            chart = extract_chart_for_section(title, ticker, body=body)
            if chart:
                if not existing_ok:
                    section["chart_data"] = chart
                    changes.append(f"{title}: {chart.get('type')}")
            elif existing and not existing_ok:
                section["chart_data"] = None
                changes.append(f"{title}: cleared invalid")

        if changes:
            path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
            patched += 1
            print(f"  {ticker}: {changes}")

    sec02 = sec03 = 0
    for path in CACHE_DIR.glob("*.json"):
        data = json.loads(path.read_text(encoding="utf-8"))
        for section in data.get("sections", []):
            if section.get("title") == SECTION_BUSINESS and section.get("chart_data"):
                sec02 += 1
            if section.get("title") == SECTION_FINANCIAL and section.get("chart_data"):
                sec03 += 1

    print(f"\nDone: {patched} file(s) updated | Sec02={sec02} Sec03={sec03}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

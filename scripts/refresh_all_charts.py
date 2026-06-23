"""Force-refresh all Sec 02/03 charts (ignores existing valid charts)."""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from agents.chart_data import CHART_SECTIONS, SECTION_BUSINESS, SECTION_FINANCIAL
from agents.chart_extract import extract_chart_for_section

CACHE_DIR = ROOT / "backend" / "data" / "report_cache" / "v7-charts"


def main() -> int:
    sec02 = sec03 = 0
    for path in sorted(CACHE_DIR.glob("*.json")):
        ticker = path.stem.upper()
        data = json.loads(path.read_text(encoding="utf-8"))
        changed = False
        for section in data.get("sections", []):
            title = section.get("title", "")
            if title not in CHART_SECTIONS:
                continue
            chart = extract_chart_for_section(title, ticker, body=section.get("body", ""))
            if section.get("chart_data") != chart:
                section["chart_data"] = chart
                changed = True
        if changed:
            path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
            print(f"  {ticker}")
        for section in data.get("sections", []):
            if section.get("title") == SECTION_BUSINESS and section.get("chart_data"):
                sec02 += 1
            if section.get("title") == SECTION_FINANCIAL and section.get("chart_data"):
                sec03 += 1
    print(f"Done | Sec02={sec02} Sec03={sec03}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

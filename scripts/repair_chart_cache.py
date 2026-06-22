"""
Re-parse Section 02/03 bodies in v7-charts disk cache to recover nested chart_data.

No Groq calls, no cache version bump — parse fix only.
Run from repo root: python scripts/repair_chart_cache.py
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from agents.chart_data import CHART_SECTIONS, SECTION_BUSINESS, SECTION_FINANCIAL
from agents.report_section_parse import parse_section_json

CACHE_DIR = ROOT / "backend" / "data" / "report_cache" / "v7-charts"


def repair_file(path: Path) -> dict[str, str]:
    data = json.loads(path.read_text(encoding="utf-8"))
    changes: dict[str, str] = {}

    for section in data.get("sections", []):
        title = section.get("title", "")
        if title not in CHART_SECTIONS:
            continue

        old_body = section.get("body", "")
        old_chart = section.get("chart_data")

        if not isinstance(old_body, str):
            continue

        new_body, new_chart = old_body, old_chart
        if old_body.strip().startswith("{"):
            new_body, new_chart = parse_section_json(old_body, title)
        elif isinstance(old_body, str) and old_body.startswith('"') and old_chart:
            new_body = old_body.lstrip('"').rstrip('"').strip()

        if new_body == old_body and new_chart == old_chart:
            continue

        section["body"] = new_body
        if new_chart is not None:
            section["chart_data"] = new_chart
            changes[title] = f"chart recovered ({new_chart.get('type')})"
        elif old_chart is None:
            changes[title] = "body unwrapped (no valid chart)"
        else:
            changes[title] = "body cleaned"

    if changes:
        path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    return changes


def main() -> int:
    if not CACHE_DIR.is_dir():
        print(f"Cache dir not found: {CACHE_DIR}")
        return 1

    files = sorted(CACHE_DIR.glob("*.json"))
    sec02_before = sec03_before = sec02_after = sec03_after = 0
    repaired = 0

    for path in files:
        data = json.loads(path.read_text(encoding="utf-8"))
        for section in data.get("sections", []):
            title = section.get("title")
            chart = section.get("chart_data")
            if title == SECTION_BUSINESS and chart:
                sec02_before += 1
            if title == SECTION_FINANCIAL and chart:
                sec03_before += 1

    print(f"Repairing {len(files)} cache files in {CACHE_DIR.name}/...")
    for path in files:
        changes = repair_file(path)
        if changes:
            repaired += 1
            print(f"  {path.stem}: {changes}")

    for path in files:
        data = json.loads(path.read_text(encoding="utf-8"))
        for section in data.get("sections", []):
            title = section.get("title")
            chart = section.get("chart_data")
            if title == SECTION_BUSINESS and chart:
                sec02_after += 1
            if title == SECTION_FINANCIAL and chart:
                sec03_after += 1

    print(
        f"\nDone: {repaired} file(s) updated | "
        f"Sec02 donut {sec02_before}->{sec02_after} | "
        f"Sec03 bar {sec03_before}->{sec03_after}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

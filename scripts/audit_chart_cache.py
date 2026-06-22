import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from agents.chart_data import SECTION_FINANCIAL
from agents.report_section_parse import parse_section_json

cache = ROOT / "backend" / "data" / "report_cache" / "v7-charts"
for path in sorted(cache.glob("*.json")):
    data = json.loads(path.read_text(encoding="utf-8"))
    sec = next(s for s in data["sections"] if s["title"] == SECTION_FINANCIAL)
    body = sec["body"]
    chart = sec.get("chart_data")
    starts = body.strip().startswith("{")
    nc = parse_section_json(body, SECTION_FINANCIAL)[1] if starts else None
    flags = []
    if chart:
        flags.append("HAS_CHART")
    if starts:
        flags.append("JSON_BODY")
    if starts and nc and not chart:
        flags.append("RECOVERABLE")
    if starts and not nc:
        flags.append("PARSE_FAIL")
    print(f"{path.stem:12} {' '.join(flags) or 'plain'}")

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
from agents.chart_data import SECTION_BUSINESS, SECTION_FINANCIAL
from agents.chart_extract import extract_chart_for_section

CACHE = Path(__file__).resolve().parents[1] / "backend" / "data" / "report_cache" / "v7-charts"
sec02 = sec03 = 0
missing_fin: list[str] = []
for path in sorted(CACHE.glob("*.json")):
    ticker = path.stem.upper()
    data = json.loads(path.read_text(encoding="utf-8"))
    for section in data["sections"]:
        title = section["title"]
        body = section.get("body", "")
        chart = section.get("chart_data")
        if title == SECTION_FINANCIAL:
            if chart:
                sec03 += 1
                rev = chart["datasets"][0]["values"]
                print(f"{ticker} FIN ok rev={rev}")
            else:
                missing_fin.append(ticker)
                live = extract_chart_for_section(title, ticker, body=body)
                print(f"{ticker} FIN missing cache live={'yes' if live else 'no'}")
        if title == SECTION_BUSINESS and chart:
            sec02 += 1

print(f"\nSec02={sec02} Sec03={sec03} missing={missing_fin}")

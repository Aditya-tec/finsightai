"""Tests for report section JSON parsing (run: python -m agents.test_report_chart_parse)."""
from __future__ import annotations

from agents.chart_data import SECTION_BUSINESS, SECTION_FINANCIAL
from agents.report_section_parse import parse_section_json


def test_parse_valid_bar_json() -> None:
    raw = """{
      "body": "Revenue grew strongly in FY25.",
      "chart_data": {
        "type": "bar",
        "labels": ["FY24", "FY25"],
        "datasets": [
          {"label": "Revenue (₹ Cr)", "values": [150000, 162990]},
          {"label": "Net Profit (₹ Cr)", "values": [25000, 28000]}
        ]
      }
    }"""
    body, chart = parse_section_json(raw, SECTION_FINANCIAL)
    assert "Revenue grew" in body
    assert chart is not None
    assert chart["type"] == "bar"


def test_parse_valid_donut_json() -> None:
    raw = """{
      "body": "Segments are diversified.",
      "chart_data": {
        "type": "donut",
        "segments": [
          {"label": "Retail", "value": 22059},
          {"label": "FS", "value": 45175}
        ]
      }
    }"""
    body, chart = parse_section_json(raw, SECTION_BUSINESS)
    assert chart is not None
    assert len(chart["segments"]) == 2


def test_parse_invalid_chart_returns_null() -> None:
    raw = '{"body": "Text only.", "chart_data": {"type": "bar", "labels": ["A","B"], "datasets": []}}'
    body, chart = parse_section_json(raw, SECTION_FINANCIAL)
    assert body == "Text only."
    assert chart is None


def test_parse_plain_prose_fallback() -> None:
    body, chart = parse_section_json("Plain prose without JSON.", SECTION_FINANCIAL)
    assert "Plain prose" in body
    assert chart is None


if __name__ == "__main__":
    test_parse_valid_bar_json()
    test_parse_valid_donut_json()
    test_parse_invalid_chart_returns_null()
    test_parse_plain_prose_fallback()
    print("All report chart parse checks passed.")

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


def test_parse_double_encoded_body_with_inner_chart() -> None:
    """Groq sometimes nests JSON in body while outer chart_data is null."""
    raw = """{
      "body": "{\\"body\\": \\"Revenue grew in FY25.\\", \\"chart_data\\": {\\"type\\":\\"bar\\",\\"labels\\":[\\"FY24\\",\\"FY25\\"],\\"datasets\\":[{\\"label\\":\\"Revenue (₹ Cr)\\",\\"values\\":[150000,162990]},{\\"label\\":\\"Net Profit (₹ Cr)\\",\\"values\\":[25000,28000]}]}}",
      "chart_data": null
    }"""
    body, chart = parse_section_json(raw, SECTION_FINANCIAL)
    assert body == "Revenue grew in FY25."
    assert chart is not None
    assert chart["type"] == "bar"


def test_parse_inner_json_string_directly() -> None:
    """Cached disk bodies are often the inner JSON object as a string."""
    raw = (
        '{"body": "HDFC Bank PAT grew 10.7%.", "chart_data": {"type":"bar",'
        '"labels":["FY24","FY25"],"datasets":['
        '{"label":"Revenue (₹ Cr)","values":[283649,336367]},'
        '{"label":"Net Profit (₹ Cr)","values":[60712,67347]}]}}'
    )
    body, chart = parse_section_json(raw, SECTION_FINANCIAL)
    assert "HDFC Bank PAT" in body
    assert chart is not None
    assert chart["datasets"][0]["values"] == [283649.0, 336367.0]


def test_parse_lenient_json_with_literal_newlines() -> None:
    """Groq often emits unescaped newlines inside the body string."""
    raw = (
        '{"body": "\nRevenue grew in FY25.\n\nDeposits increased.", '
        '"chart_data": {"type":"bar","labels":["FY24","FY25"],'
        '"datasets":[{"label":"Revenue (₹ Cr)","values":[100,120]},'
        '{"label":"Net Profit (₹ Cr)","values":[10,12]}]}}'
    )
    body, chart = parse_section_json(raw, SECTION_FINANCIAL)
    assert "Revenue grew in FY25" in body
    assert chart is not None
    assert chart["type"] == "bar"


def test_parse_lenient_json_with_missing_datasets_bracket() -> None:
    """Groq sometimes closes datasets with }} instead of }]}"""
    raw = (
        '{"body": "TCS revenue grew.", "chart_data": {"type":"bar","labels":["FY24","FY25"],'
        '"datasets":[{"label":"Revenue (Cr)","values":[240893,255324]},'
        '{"label":"Net Profit (Cr)","values":[45908,48553]}}'
    )
    body, chart = parse_section_json(raw, SECTION_FINANCIAL)
    assert "TCS revenue" in body
    assert chart is not None
    assert chart["type"] == "bar"
    assert len(chart["datasets"]) == 2


def test_parse_three_year_labels_normalized_to_fy24_fy25() -> None:
    raw = (
        '{"body": "SBI grew.", "chart_data": {"type":"bar","labels":["FY23","FY24","FY25"],'
        '"datasets":[{"label":"Revenue (Cr)","values":[368719,466813,524172]},'
        '{"label":"Net Profit (Cr)","values":[50232,61077,70901]}}'
    )
    body, chart = parse_section_json(raw, SECTION_FINANCIAL)
    assert chart is not None
    assert chart["labels"] == ["FY24", "FY25"]
    assert chart["datasets"][0]["values"] == [466813.0, 524172.0]


if __name__ == "__main__":
    test_parse_valid_bar_json()
    test_parse_valid_donut_json()
    test_parse_invalid_chart_returns_null()
    test_parse_plain_prose_fallback()
    test_parse_double_encoded_body_with_inner_chart()
    test_parse_inner_json_string_directly()
    test_parse_lenient_json_with_literal_newlines()
    test_parse_lenient_json_with_missing_datasets_bracket()
    test_parse_three_year_labels_normalized_to_fy24_fy25()
    print("All report chart parse checks passed.")

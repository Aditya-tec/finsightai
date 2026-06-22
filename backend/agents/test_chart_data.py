"""Tests for chart_data validation (run: python -m agents.test_chart_data)."""
from __future__ import annotations

from agents.chart_data import SECTION_BUSINESS, SECTION_FINANCIAL, validate_chart_data


def test_valid_bar_chart() -> None:
    raw = {
        "type": "bar",
        "labels": ["FY24", "FY25"],
        "datasets": [
            {"label": "Revenue (₹ Cr)", "values": [150000, 162990]},
            {"label": "Net Profit (₹ Cr)", "values": [25000, 28000]},
        ],
    }
    result = validate_chart_data(SECTION_FINANCIAL, raw)
    assert result is not None
    assert result["type"] == "bar"


def test_valid_donut_chart() -> None:
    raw = {
        "type": "donut",
        "segments": [
            {"label": "Financial Services", "value": 45175},
            {"label": "Retail", "value": 22059},
            {"label": "Communication", "value": 19108},
        ],
    }
    result = validate_chart_data(SECTION_BUSINESS, raw)
    assert result is not None
    assert len(result["segments"]) == 3


def test_rejects_wrong_section_type() -> None:
    bar = {"type": "bar", "labels": ["FY24", "FY25"], "datasets": [{"label": "R", "values": [1, 2]}]}
    assert validate_chart_data(SECTION_BUSINESS, bar) is None


def test_rejects_invalid_labels() -> None:
    raw = {
        "type": "bar",
        "labels": ["2024", "2025"],
        "datasets": [{"label": "Revenue", "values": [100, 110]}],
    }
    assert validate_chart_data(SECTION_FINANCIAL, raw) is None


def test_null_passthrough() -> None:
    assert validate_chart_data(SECTION_FINANCIAL, None) is None


if __name__ == "__main__":
    test_valid_bar_chart()
    test_valid_donut_chart()
    test_rejects_wrong_section_type()
    test_rejects_invalid_labels()
    test_null_passthrough()
    print("All chart_data checks passed.")

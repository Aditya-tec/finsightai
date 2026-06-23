from __future__ import annotations

import json
from pathlib import Path

import document_corpus
from agents.chart_data import SECTION_FINANCIAL
from agents.chart_extract import extract_chart_for_section, extract_financial_bar
from settings import settings


def _with_parsed_dir(parsed_dir: Path):
    class _Ctx:
        def __enter__(self):
            self.old = settings.parsed_data_dir
            settings.parsed_data_dir = str(parsed_dir)
            document_corpus._load_parsed_file.cache_clear()
            return self

        def __exit__(self, *args):
            settings.parsed_data_dir = self.old
            document_corpus._load_parsed_file.cache_clear()

    return _Ctx()


def test_extract_financial_bar_from_board_table(tmp_path: Path) -> None:
    text = """
    Financial results
    (` crore)
    Standalone
    Consolidated
    Financial Year 2024-25 (FY 2025)
    Financial Year 2023-24 (FY 2024)
    Financial Year 2024-25 (FY 2025)
    Financial Year 2023-24 (FY 2024)
    Revenue from operations
    2,14,853
    2,02,359
    2,55,324
    2,40,893
    Profit for the year
    48,057
    43,559
    48,797
    46,099
    Shareholders of the Company
    48,057
    43,559
    48,553
    45,908
    """
    pages = [{"page_number": 70, "text": text}]
    root = tmp_path / "parsed"
    root.mkdir()
    (root / "DEMO_FY25.json").write_text(json.dumps(pages), encoding="utf-8")

    with _with_parsed_dir(root):
        chart = extract_financial_bar("DEMO")
        assert chart is not None
        assert chart["type"] == "bar"
        assert chart["labels"] == ["FY24", "FY25"]
        assert chart["datasets"][0]["values"] == [240893.0, 255324.0]


def test_extract_financial_from_body_fallback() -> None:
    body = (
        "The consolidated revenue from operations stood at ₹2,55,324 crore for FY 2025, "
        "representing an increase over the previous year's revenue from operations of ₹2,40,893 crore. "
        "The profit for the year attributable to shareholders for FY 2025 was ₹48,553 crore, "
        "compared to ₹45,908 crore in FY 2024."
    )
    chart = extract_chart_for_section(SECTION_FINANCIAL, "TCS", body=body)
    assert chart is not None
    assert chart["datasets"][0]["values"] == [240893.0, 255324.0]


def test_infy_body_revenue_not_pbt() -> None:
    body = (
        "revenue from operations of ₹162,990 crore and other income. "
        "year-on-year increase in revenue from operations from ₹153,670 crore in the previous year. "
        "profit before tax stood at ₹37,608 crore. "
        "The net profit of ₹26,750 crore. The net profit for the previous year was ₹26,248 crore."
    )
    from agents.chart_extract import _extract_pl_from_body

    pair = _extract_pl_from_body(body)
    assert pair is not None
    assert pair[0] == [153670.0, 162990.0]
    assert pair[1] == [26248.0, 26750.0]

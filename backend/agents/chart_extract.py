from __future__ import annotations

import json
import re
from pathlib import Path

from agents.chart_data import SECTION_BUSINESS, SECTION_FINANCIAL, validate_chart_data
from document_corpus import parsed_json_path
from settings import settings

_NUM = re.compile(r"[\d,]+(?:\.\d+)?")
_CRORE_AMOUNT = re.compile(
    r"(?:₹|Rs\.?|INR\s*)?\s*([\d,]+(?:\.\d+)?)\s*(?:crore|cr\b)",
    re.IGNORECASE,
)
_SEGMENT_CRORE = re.compile(
    r"([A-Za-z][A-Za-z0-9\s,&\-/]{4,55}?)\s*\(\s*(?:₹|Rs\.?)?\s*([\d,]+(?:\.\d+)?)\s*(?:crore|cr\b)",
    re.IGNORECASE,
)
_SEGMENT_PCT = re.compile(
    r"([A-Za-z][A-Za-z0-9\s,&\-/]{4,55}?)\s*\(\s*([\d.]+)\s*%\s*\)",
)


def _load_pages(ticker: str, fiscal_year: str = "FY25") -> list[str]:
    path = parsed_json_path(ticker, fiscal_year)
    if not path.is_file():
        alt = Path(settings.parsed_data_dir) / f"{ticker}_{fiscal_year}.json"
        if not alt.is_file():
            return []
        path = alt
    pages = json.loads(path.read_text(encoding="utf-8"))
    return [p.get("text", "") for p in pages if isinstance(p, dict)]


def _load_text(ticker: str, fiscal_year: str = "FY25") -> str:
    return "\n".join(_load_pages(ticker, fiscal_year))


def _parse_amount(s: str) -> float | None:
    cleaned = s.replace(",", "").strip()
    try:
        return float(cleaned)
    except ValueError:
        return None


def _unit_hint(block: str) -> str:
    lower = block.lower()
    if "in million" in lower or "` in million" in lower or "(` in million" in lower:
        return "million"
    if "in lakh" in lower or "(` in lakh" in lower:
        return "lakh"
    if "in crore" in lower or "(` crore" in lower or "₹ in crore" in lower or "(c in crore)" in lower:
        return "crore"
    return "crore"


def _to_crore(value: float, unit_hint: str) -> float:
    hint = unit_hint.lower()
    if "million" in hint:
        return round(value / 10.0, 1)
    if "lakh" in hint:
        return round(value / 100.0, 1)
    return round(value, 1)


def _nums_after_label(block: str, label: str, count: int = 4) -> list[float] | None:
    pattern = rf"{re.escape(label)}\s*\n?\s*((?:[\d,]+(?:\.\d+)?\s*\n?\s*){{2,{count}}})"
    m = re.search(pattern, block, re.IGNORECASE)
    if not m:
        return None
    nums = [_parse_amount(n.group()) for n in _NUM.finditer(m.group(1))]
    nums = [n for n in nums if n is not None]
    if len(nums) < 2:
        return None
    if len(nums) >= 4:
        return nums[:4]
    return nums[-2:] if len(nums) >= 2 else None


def _extract_board_financial_results(text: str) -> tuple[list[float], list[float]] | None:
    """Parse Board's Report 4-column standalone/consolidated FY25/FY24 table."""
    idx = re.search(r"Financial (?:results|highlights)", text, re.IGNORECASE)
    if not idx:
        return None
    block = text[idx.start() : idx.start() + 14000]
    unit = _unit_hint(block[:800])

    rev_nums = _nums_after_label(block, "Revenue from operations", 4)
    if not rev_nums:
        rev_nums = _nums_after_label(block, "Total income", 4)
    if not rev_nums:
        return None

    if len(rev_nums) >= 4:
        cons_fy25, cons_fy24 = rev_nums[2], rev_nums[3]
    else:
        cons_fy25, cons_fy24 = rev_nums[-2], rev_nums[-1]

    pat_nums = _nums_after_label(block, "Shareholders of the Company", 4)
    if not pat_nums:
        pat_nums = _nums_after_label(block, "Profit for the year", 4)
    if not pat_nums:
        pat_nums = _nums_after_label(block, "Profit after tax", 4)
    if not pat_nums:
        return None

    if len(pat_nums) >= 4:
        pat_fy25, pat_fy24 = pat_nums[2], pat_nums[3]
    else:
        pat_fy25, pat_fy24 = pat_nums[-2], pat_nums[-1]

    rev = [_to_crore(cons_fy24, unit), _to_crore(cons_fy25, unit)]
    pat = [_to_crore(pat_fy24, unit), _to_crore(pat_fy25, unit)]
    if not _bar_sane(rev, pat):
        return None
    return rev, pat


def _extract_consolidated_pl(text: str) -> tuple[list[float], list[float]] | None:
    """Two-column consolidated P&L (FY25 col, FY24 col)."""
    idx = re.search(r"consolidated statement of profit", text, re.IGNORECASE)
    if not idx:
        return None
    block = text[idx.start() : idx.start() + 12000]
    unit = _unit_hint(block[:600])

    rev_nums = _nums_after_label(block, "Revenue from operations", 2)
    if not rev_nums:
        rev_nums = _nums_after_label(block, "Total income", 2)
    if not rev_nums or len(rev_nums) < 2:
        return None
    rev_fy25, rev_fy24 = rev_nums[0], rev_nums[1]

    pat_nums = _nums_after_label(block, "Profit for the year", 2)
    if not pat_nums:
        pat_nums = _nums_after_label(block, "Profit after tax", 2)
    if not pat_nums or len(pat_nums) < 2:
        return None
    pat_fy25, pat_fy24 = pat_nums[0], pat_nums[1]

    rev = [_to_crore(rev_fy24, unit), _to_crore(rev_fy25, unit)]
    pat = [_to_crore(pat_fy24, unit), _to_crore(pat_fy25, unit)]
    if not _bar_sane(rev, pat):
        return None
    return rev, pat


def _bar_sane(rev: list[float], pat: list[float]) -> bool:
    for series in (rev, pat):
        if len(series) != 2 or not all(n > 0 for n in series):
            return False
        lo, hi = min(series), max(series)
        if lo <= 0 or hi / lo > 8:
            return False
    if max(rev) < 50:
        return False
    if max(pat) > max(rev):
        return False
    return True


def _amount_to_crore(value: float, unit: str | None) -> float:
    u = (unit or "crore").lower()
    if "billion" in u:
        return round(value * 100.0, 1)
    if "million" in u or u == "mn":
        return round(value / 10.0, 1)
    if "lakh" in u:
        return round(value / 100.0, 1)
    return round(value, 1)


_FY25 = r"FY['\s]*(?:20)?25"
_FY24 = r"FY['\s]*(?:20)?24"


def _find_metric_pair(text: str, labels: tuple[str, ...]) -> tuple[float, float] | None:
    for label in labels:
        label_pat = re.escape(label).replace(r"\ ", r"\s+")
        patterns = [
            # "metric of ₹X crore ... from ₹Y crore in the previous year"
            rf"{label_pat}\s+of\s+₹\s*([\d,]+(?:\.\d+)?)\s*(crore|million|cr\b|billion)?[^\n]{{0,120}}from\s+₹\s*([\d,]+(?:\.\d+)?)\s*(crore|million|cr\b|billion)?[^\n]{{0,40}}previous year",
            # "stood at ₹X ... FY25 ... previous year ... ₹Y" (TCS-style prose)
            rf"(?:consolidated\s+)?{label_pat}\s+stood at\s+₹\s*([\d,]+(?:\.\d+)?)\s*(crore|million|cr\b|billion)?[^\n]{{0,100}}{_FY25}[^\n]{{0,160}}previous year(?:'s)?[^\n]{{0,80}}₹\s*([\d,]+(?:\.\d+)?)\s*(crore|million|cr\b|billion)?",
            # "for FY25 was ₹X ... compared to ₹Y ... FY24" (shareholder PAT prose)
            rf"{label_pat}\s+for {_FY25}\s+was\s+₹\s*([\d,]+(?:\.\d+)?)\s*(crore|million|cr\b|billion)?[^\n]{{0,50}}compared to\s+₹\s*([\d,]+(?:\.\d+)?)\s*(crore|million|cr\b|billion)?[^\n]{{0,40}}{_FY24}",
            # "[Consolidated] stood at ₹X million in FY'25, compared to ₹Y million in FY'24"
            rf"{label_pat}(?:\s*\[[^\]]+\])?\s*stood at\s+₹\s*([\d,]+(?:\.\d+)?)\s*(crore|million|cr\b|billion)?[^\n]{{0,40}}{_FY25}[^\n]{{0,40}}compared to\s+₹\s*([\d,]+(?:\.\d+)?)\s*(crore|million|cr\b|billion)?[^\n]{{0,30}}{_FY24}",
            # consolidated sales in billion (Wipro-style)
            rf"(?:{label_pat}|sales)[^\n]{{0,30}}₹\s*([\d,]+(?:\.\d+)?)\s*(billion)[^\n]{{0,80}}previous year[^\n]{{0,40}}₹\s*([\d,]+(?:\.\d+)?)\s*(billion)",
            rf"(?:{label_pat}|sales)[^\n]{{0,30}}₹\s*([\d,]+(?:\.\d+)?)\s*(billion)[^\n]{{0,80}}as against\s+₹\s*([\d,]+(?:\.\d+)?)\s*(billion)[^\n]{{0,40}}previous year",
            # "metric ... ₹X ... FY25 ... ₹Y ... FY24" (short window)
            rf"{label_pat}(?:\s*\[[^\]]+\])?[^\n]{{0,40}}₹\s*([\d,]+(?:\.\d+)?)\s*(crore|million|cr\b|billion)?[^\n]{{0,60}}{_FY25}[^\n]{{0,60}}₹\s*([\d,]+(?:\.\d+)?)\s*(crore|million|cr\b|billion)?[^\n]{{0,30}}{_FY24}",
            rf"{label_pat}(?:\s*\[[^\]]+\])?[^\n]{{0,40}}₹\s*([\d,]+(?:\.\d+)?)\s*(crore|million|cr\b|billion)?[^\n]{{0,60}}{_FY24}[^\n]{{0,60}}₹\s*([\d,]+(?:\.\d+)?)\s*(crore|million|cr\b|billion)?[^\n]{{0,30}}{_FY25}",
        ]
        for pat in patterns:
            m = re.search(pat, text, re.IGNORECASE | re.DOTALL)
            if m:
                fy25, unit25, fy24, unit24 = m.group(1), m.group(2), m.group(3), m.group(4)
                v25, v24 = _parse_amount(fy25), _parse_amount(fy24)
                if v25 and v24:
                    pair = (_amount_to_crore(v24, unit24), _amount_to_crore(v25, unit25))
                    return pair
    return None


def _extract_pl_from_body(body: str) -> tuple[list[float], list[float]] | None:
    """Parse FY24/FY25 revenue and PAT from report section prose."""
    if not body:
        return None
    text = body.replace("**", " ")

    rev = _find_metric_pair(
        text,
        (
            "revenue from operations",
            "net sales",
            "sales",
            "total income",
            "interest earned",
            "total interest earned",
        ),
    )
    pat = _find_metric_pair(
        text,
        (
            "profit for the year attributable to shareholders",
            "profit after tax",
            "Profit After Tax (PAT)",
            "net profit (PAT)",
            "net profit",
        ),
    )
    if not pat:
        m = re.search(
            r"net profit of ₹\s*([\d,]+(?:\.\d+)?)\s*crore.*?previous year was ₹\s*([\d,]+(?:\.\d+)?)\s*crore",
            text,
            re.IGNORECASE | re.DOTALL,
        )
        if m:
            v25, v24 = _parse_amount(m.group(1)), _parse_amount(m.group(2))
            if v25 and v24:
                pat = (v24, v25)
        if not pat:
            for pat_str in (
                r"net profit \(PAT\)[^\n]{0,40}\[Consolidated\][^\n]{0,20}for FY['\s]*25[^\n]{0,30}₹\s*([\d,]+(?:\.\d+)?)\s*(million|crore|billion)?[^\n]{0,40}compared to\s+₹\s*([\d,]+(?:\.\d+)?)\s*(million|crore|billion)?[^\n]{0,30}FY['\s]*24",
                r"net profit increased to ₹\s*([\d,]+(?:\.\d+)?)\s*(billion)[^\n]{0,80}as against\s+₹\s*([\d,]+(?:\.\d+)?)\s*(billion)[^\n]{0,40}previous year",
            ):
                m = re.search(pat_str, text, re.IGNORECASE | re.DOTALL)
                if m:
                    v25, unit25, v24, unit24 = m.group(1), m.group(2), m.group(3), m.group(4)
                    p25, p24 = _parse_amount(v25), _parse_amount(v24)
                    if p25 and p24:
                        pat = (_amount_to_crore(p24, unit24), _amount_to_crore(p25, unit25))
                        break

    if not rev or not pat:
        return None
    if not _bar_sane(list(rev), list(pat)):
        return None
    return [rev[0], rev[1]], [pat[0], pat[1]]


def _extract_pl_pair(text: str) -> tuple[list[float], list[float]] | None:
    board = _extract_board_financial_results(text)
    if board:
        return board
    return _extract_consolidated_pl(text)


def _row_two_column_table(text: str, label: str) -> tuple[float, float] | None:
    """Parse FY25/FY24 values from bank-style two-column tables (2024-25 / 2023-24)."""
    m = re.search(
        rf"{re.escape(label)}\s*\n\s*([\d,]+(?:\.\d+)?)\s*\n\s*([\d,]+(?:\.\d+)?)\s*\n",
        text,
        re.IGNORECASE,
    )
    if not m:
        return None
    fy25, fy24 = _parse_amount(m.group(1)), _parse_amount(m.group(2))
    if fy25 is None or fy24 is None:
        return None
    return fy24, fy25


def _extract_two_column_highlights(text: str) -> tuple[list[float], list[float]] | None:
    if "2024-25" not in text and "2023-24" not in text:
        return None
    rev = (
        _row_two_column_table(text, "Operating revenue")
        or _row_two_column_table(text, "Net interest income")
        or _row_two_column_table(text, "Total income")
        or _row_two_column_table(text, "Revenue from operations")
    )
    pat = _row_two_column_table(text, "Net profit") or _row_two_column_table(text, "Profit after tax")
    if not rev or not pat:
        return None
    rev_pair = [rev[0], rev[1]]
    pat_pair = [pat[0], pat[1]]
    if not _bar_sane(rev_pair, pat_pair):
        return None
    return rev_pair, pat_pair


def _extract_ten_year_highlights(page: str) -> tuple[list[float], list[float]] | None:
    """Parse '10 YEAR FINANCIAL HIGHLIGHTS' tables used by banks (Interest income + PAT)."""
    if not re.search(r"10\s+year\s+financial\s+highlights", page, re.IGNORECASE):
        return None

    def last_two_after(label: str) -> list[float] | None:
        m = re.search(rf"{re.escape(label)}\s*((?:[\d,]+(?:\.\d+)?\s*)+)", page, re.IGNORECASE)
        if not m:
            return None
        nums = [_parse_amount(n.group()) for n in _NUM.finditer(m.group(1))]
        nums = [n for n in nums if n and n > 100]
        return nums[-2:] if len(nums) >= 2 else None

    rev = last_two_after("Interest income") or last_two_after("Total income")
    pat = last_two_after("Profit after tax") or last_two_after("Net profit")
    if not rev or not pat:
        return None
    rev_pair = [rev[0], rev[1]]
    pat_pair = [pat[0], pat[1]]
    if not _bar_sane(rev_pair, pat_pair):
        return None
    return rev_pair, pat_pair


def _extract_pl_from_pages(pages: list[str]) -> tuple[list[float], list[float]] | None:
    for page in pages:
        if re.search(r"financial (?:results|highlights)", page, re.IGNORECASE):
            pair = _extract_board_financial_results(page)
            if pair:
                return pair
    for page in pages:
        highlights = _extract_ten_year_highlights(page)
        if highlights:
            return highlights
    highlight_pages = [
        p for p in pages if re.search(r"financial (?:results|highlights)", p, re.IGNORECASE)
    ]
    if highlight_pages:
        block = "\n".join(highlight_pages[:6])
        pair = _extract_two_column_highlights(block)
        if pair:
            return pair
    # Bank tables sometimes split NII and Net profit across pages.
    pair = _extract_two_column_highlights("\n".join(pages))
    if pair:
        return pair
    for page in pages:
        highlights = _extract_ten_year_highlights(page)
        if highlights:
            return highlights
    for page in pages:
        if re.search(r"consolidated statement of profit", page, re.IGNORECASE):
            pair = _extract_consolidated_pl(page)
            if pair:
                return pair
    return _extract_pl_pair("\n".join(pages[:120]))


def _bar_chart(rev: list[float], pat: list[float]) -> dict | None:
    raw = {
        "type": "bar",
        "labels": ["FY24", "FY25"],
        "datasets": [
            {"label": "Revenue (₹ Cr)", "values": rev},
            {"label": "Net Profit (₹ Cr)", "values": pat},
        ],
    }
    return validate_chart_data(SECTION_FINANCIAL, raw)


def extract_financial_bar(
    ticker: str, fiscal_year: str = "FY25", *, body: str | None = None
) -> dict | None:
    pages = _load_pages(ticker, fiscal_year)
    pair = _extract_pl_from_pages(pages) if pages else None
    if pair:
        chart = _bar_chart(*pair)
        if chart:
            return chart
    if body:
        body_pair = _extract_pl_from_body(body)
        if body_pair:
            chart = _bar_chart(*body_pair)
            if chart:
                return chart
    return None


def _extract_donut_from_body(body: str) -> list[dict] | None:
    if not body:
        return None
    segments: list[dict] = []
    seen: set[str] = set()

    for m in _SEGMENT_CRORE.finditer(body):
        label = re.sub(r"\s+", " ", m.group(1).strip())
        val = _parse_amount(m.group(2))
        if not val or val < 50:
            continue
        key = label.lower()[:30]
        if key in seen:
            continue
        seen.add(key)
        segments.append({"label": label[:40], "value": round(val, 1)})
        if len(segments) >= 6:
            break

    if len(segments) < 2:
        segments = []
        seen.clear()
        for m in _SEGMENT_PCT.finditer(body):
            label = re.sub(r"\s+", " ", m.group(1).strip())
            pct = _parse_amount(m.group(2))
            if not pct or pct <= 0 or pct > 100:
                continue
            if label.lower().startswith(("the ", "with ", "and ")):
                continue
            key = label.lower()[:30]
            if key in seen:
                continue
            seen.add(key)
            segments.append({"label": label[:40], "value": round(pct, 1)})
            if len(segments) >= 6:
                break

    return segments if len(segments) >= 2 else None


def _extract_donut_from_filing(text: str) -> list[dict] | None:
    segments: list[dict] = []
    seen: set[str] = set()
    for m in _SEGMENT_CRORE.finditer(text[:120000]):
        label = re.sub(r"\s+", " ", m.group(1).strip())
        val = _parse_amount(m.group(2))
        if not val or val < 100:
            continue
        key = label.lower()[:30]
        if key in seen:
            continue
        seen.add(key)
        segments.append({"label": label[:40], "value": round(val, 1)})
        if len(segments) >= 6:
            break
    return segments if len(segments) >= 2 else None


def extract_business_donut(
    ticker: str, fiscal_year: str = "FY25", *, body: str | None = None
) -> dict | None:
    if body:
        segments = _extract_donut_from_body(body)
        if segments:
            raw = {"type": "donut", "segments": segments[:5]}
            chart = validate_chart_data(SECTION_BUSINESS, raw)
            if chart:
                return chart

    text = _load_text(ticker, fiscal_year)
    if text:
        segments = _extract_donut_from_filing(text)
        if segments:
            raw = {"type": "donut", "segments": segments[:5]}
            return validate_chart_data(SECTION_BUSINESS, raw)
    return None


def extract_chart_for_section(
    section_title: str,
    ticker: str,
    fiscal_year: str = "FY25",
    *,
    body: str | None = None,
) -> dict | None:
    if section_title == SECTION_FINANCIAL:
        return extract_financial_bar(ticker, fiscal_year, body=body)
    if section_title == SECTION_BUSINESS:
        return extract_business_donut(ticker, fiscal_year, body=body)
    return None

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

from settings import settings

TICKER_ALIASES = {"TATAMOTERS": "TATAMOTORS"}


def normalize_ticker(ticker: str) -> str:
    upper = ticker.upper().strip()
    return TICKER_ALIASES.get(upper, upper)


def normalize_fy(fiscal_year: str) -> str:
    return fiscal_year.upper().replace(" ", "")


def pdf_path(ticker: str, fiscal_year: str) -> Path:
    t = normalize_ticker(ticker)
    fy = normalize_fy(fiscal_year)
    return Path(settings.raw_data_dir) / f"{t}_{fy}.pdf"


def parsed_json_path(ticker: str, fiscal_year: str) -> Path:
    t = normalize_ticker(ticker)
    fy = normalize_fy(fiscal_year)
    return Path(settings.parsed_data_dir) / f"{t}_{fy}.json"


@lru_cache(maxsize=32)
def _load_parsed_file(path_str: str) -> tuple[tuple[int, str], ...] | None:
    path = Path(path_str)
    if not path.is_file():
        return None
    raw = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(raw, list):
        return None
    pages: list[tuple[int, str]] = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        page_num = item.get("page_number")
        text = item.get("text", "")
        if isinstance(page_num, int) and page_num > 0:
            pages.append((page_num, str(text)))
    pages.sort(key=lambda x: x[0])
    return tuple(pages) if pages else None


def load_parsed_pages(ticker: str, fiscal_year: str) -> list[tuple[int, str]]:
    path = parsed_json_path(ticker, fiscal_year)
    loaded = _load_parsed_file(str(path.resolve()))
    return list(loaded) if loaded else []


def document_status(ticker: str, fiscal_year: str) -> dict:
    pdf = pdf_path(ticker, fiscal_year)
    parsed = parsed_json_path(ticker, fiscal_year)
    pages = load_parsed_pages(ticker, fiscal_year)
    return {
        "ticker": normalize_ticker(ticker),
        "fiscal_year": normalize_fy(fiscal_year),
        "pdf_available": pdf.is_file(),
        "parsed_available": parsed.is_file() and bool(pages),
        "page_count": len(pages),
    }


def _nearest_page(pages: list[tuple[int, str]], requested: int) -> tuple[int, str, bool]:
    if not pages:
        raise ValueError("no pages")
    for num, text in pages:
        if num == requested:
            return num, text, False
    nearest = min(pages, key=lambda p: abs(p[0] - requested))
    return nearest[0], nearest[1], True


def get_page_content(
    ticker: str,
    fiscal_year: str,
    page: int,
    *,
    section_hint: str | None = None,
) -> dict | None:
    if page < 1:
        return None

    status = document_status(ticker, fiscal_year)
    pages = load_parsed_pages(ticker, fiscal_year)

    text = ""
    actual_page = page
    page_mismatch = False

    if pages:
        actual_page, text, page_mismatch = _nearest_page(pages, page)
    elif not status["pdf_available"]:
        return None

    return {
        "ticker": status["ticker"],
        "fiscal_year": status["fiscal_year"],
        "requested_page": page,
        "page": actual_page,
        "page_mismatch": page_mismatch,
        "text": text.strip(),
        "section_hint": section_hint,
        "pdf_available": status["pdf_available"],
        "parsed_available": status["parsed_available"],
        "page_count": status["page_count"],
    }


def count_available_pdfs(tickers: list[str], fiscal_year: str = "FY25") -> tuple[int, int]:
    found = sum(1 for t in tickers if pdf_path(t, fiscal_year).is_file())
    return found, len(tickers)

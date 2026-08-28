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


def pdf_is_available(ticker: str, fiscal_year: str) -> bool:
    if pdf_path(ticker, fiscal_year).is_file():
        return True
    from services.filing_storage import pdf_available_in_storage

    return pdf_available_in_storage(ticker, fiscal_year)


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


def _parse_pages_json(raw: bytes) -> list[tuple[int, str]]:
    data = json.loads(raw.decode("utf-8"))
    if not isinstance(data, list):
        return []
    pages: list[tuple[int, str]] = []
    for item in data:
        if not isinstance(item, dict):
            continue
        page_num = item.get("page_number")
        text = item.get("text", "")
        if isinstance(page_num, int) and page_num > 0:
            pages.append((page_num, str(text)))
    pages.sort(key=lambda x: x[0])
    return pages


def _load_parsed_from_storage(ticker: str, fiscal_year: str) -> list[tuple[int, str]]:
    from services.filing_storage import download_parsed_bytes

    raw = download_parsed_bytes(ticker, fiscal_year)
    if not raw:
        return []
    try:
        return _parse_pages_json(raw)
    except (json.JSONDecodeError, UnicodeDecodeError):
        return []


def load_parsed_pages(ticker: str, fiscal_year: str) -> list[tuple[int, str]]:
    path = parsed_json_path(ticker, fiscal_year)
    loaded = _load_parsed_file(str(path.resolve()))
    if loaded:
        return list(loaded)
    return _load_parsed_from_storage(ticker, fiscal_year)


def _page_text_from_chunks(ticker: str, fiscal_year: str, page: int) -> str:
    if not settings.supabase_url or not settings.supabase_key:
        return ""
    try:
        from supabase import create_client

        client = create_client(settings.supabase_url, settings.supabase_key)
        t = normalize_ticker(ticker)
        fy = normalize_fy(fiscal_year)
        response = (
            client.table("chunks")
            .select("content, chunk_index")
            .eq("ticker", t)
            .eq("fiscal_year", fy)
            .eq("page_number", page)
            .order("chunk_index")
            .execute()
        )
        rows = response.data or []
        if not rows:
            return ""
        return "\n\n".join(str(row.get("content", "")).strip() for row in rows if row.get("content"))
    except Exception:
        return ""


def _max_page_from_chunks(ticker: str, fiscal_year: str) -> int:
    if not settings.supabase_url or not settings.supabase_key:
        return 0
    try:
        from supabase import create_client

        client = create_client(settings.supabase_url, settings.supabase_key)
        t = normalize_ticker(ticker)
        fy = normalize_fy(fiscal_year)
        response = (
            client.table("chunks")
            .select("page_number")
            .eq("ticker", t)
            .eq("fiscal_year", fy)
            .not_.is_("page_number", "null")
            .order("page_number", desc=True)
            .limit(1)
            .execute()
        )
        rows = response.data or []
        if not rows:
            return 0
        page = rows[0].get("page_number")
        return int(page) if isinstance(page, int) else 0
    except Exception:
        return 0


def document_status(ticker: str, fiscal_year: str) -> dict:
    pdf_local = pdf_path(ticker, fiscal_year).is_file()
    pdf_ok = pdf_local or pdf_is_available(ticker, fiscal_year)
    from services.filing_storage import parsed_available_in_storage

    pages = load_parsed_pages(ticker, fiscal_year)
    parsed_remote = parsed_available_in_storage(ticker, fiscal_year)
    chunk_pages = _max_page_from_chunks(ticker, fiscal_year)
    page_count = max((pages[-1][0] if pages else 0), chunk_pages)
    has_parsed = bool(pages) or parsed_remote or chunk_pages > 0
    return {
        "ticker": normalize_ticker(ticker),
        "fiscal_year": normalize_fy(fiscal_year),
        "pdf_available": pdf_ok,
        "parsed_available": has_parsed,
        "page_count": page_count,
        "storage_pdf": pdf_ok and not pdf_local,
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
    if not status["pdf_available"] and not status["parsed_available"]:
        return None

    pages = load_parsed_pages(ticker, fiscal_year)
    text = ""
    actual_page = page
    page_mismatch = False

    if pages:
        actual_page, text, page_mismatch = _nearest_page(pages, page)
    else:
        chunk_text = _page_text_from_chunks(ticker, fiscal_year, page)
        if chunk_text:
            text = chunk_text
            actual_page = page
        elif status["pdf_available"]:
            text = ""
            actual_page = page
        else:
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
    found = sum(1 for t in tickers if pdf_is_available(t, fiscal_year))
    return found, len(tickers)

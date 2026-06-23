from __future__ import annotations

from document_corpus import load_parsed_pages, normalize_fy, normalize_ticker

DEFAULT_FY = "FY25"


def _page_set(ticker: str, fiscal_year: str) -> set[int]:
    return {p for p, _ in load_parsed_pages(ticker, fiscal_year)}


def enrich_and_validate_citation(raw: dict, ticker: str, fiscal_year: str = DEFAULT_FY) -> dict:
    """Fill document metadata and validate page against parsed corpus."""
    c = dict(raw)
    sym = normalize_ticker(ticker)
    fy = normalize_fy(c.get("fiscal_year") or fiscal_year)
    c["ticker"] = normalize_ticker(c.get("ticker") or sym)
    c["fiscal_year"] = fy
    c["document_key"] = f"{c['ticker']}_{fy}"

    page = c.get("page")
    if page is None or not isinstance(page, int) or page < 1:
        c["page_valid"] = False
        c["page_mismatch"] = False
        return c

    pages = _page_set(c["ticker"], fy)
    if not pages:
        c["page_valid"] = True
        c["page_mismatch"] = False
        return c

    if page in pages:
        c["page_valid"] = True
        c["page_mismatch"] = False
    else:
        nearest = min(pages, key=lambda p: abs(p - page))
        if abs(nearest - page) <= 3:
            c["page"] = nearest
            c["page_valid"] = True
            c["page_mismatch"] = True
        else:
            c["page_valid"] = False
            c["page_mismatch"] = False
    return c


def validate_citations(citations: list[dict], ticker: str, fiscal_year: str = DEFAULT_FY) -> list[dict]:
    out: list[dict] = []
    seen: set[tuple] = set()
    for raw in citations:
        c = enrich_and_validate_citation(raw, ticker, fiscal_year)
        if c.get("page") is not None and not c.get("page_valid", True):
            continue
        key = (c.get("source"), c.get("page"), c.get("section"))
        if key in seen:
            continue
        seen.add(key)
        out.append(c)
    return out

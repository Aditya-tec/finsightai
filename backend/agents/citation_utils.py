from __future__ import annotations


def citation_from_chunk(chunk: dict) -> dict:
    ticker = chunk.get("ticker")
    fiscal_year = chunk.get("fiscal_year")
    document_key = None
    if ticker and fiscal_year:
        document_key = f"{ticker}_{fiscal_year}"
    return {
        "source": chunk.get("doc_type", "filing"),
        "page": chunk.get("page_number"),
        "section": chunk.get("section_title"),
        "ticker": ticker,
        "fiscal_year": fiscal_year,
        "document_key": document_key,
    }

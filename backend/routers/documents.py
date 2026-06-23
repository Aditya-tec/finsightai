from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse

from document_corpus import document_status, get_page_content, pdf_path

router = APIRouter()


@router.get("/documents/{ticker}/{fiscal_year}/status")
async def get_document_status(ticker: str, fiscal_year: str):
    return document_status(ticker, fiscal_year)


@router.get("/documents/{ticker}/{fiscal_year}/pages/{page}")
async def get_document_page(
    ticker: str,
    fiscal_year: str,
    page: int,
    section: str | None = Query(default=None),
):
    if page < 1:
        raise HTTPException(status_code=400, detail="Page number must be >= 1")

    payload = get_page_content(ticker, fiscal_year, page, section_hint=section)
    if payload is None:
        status = document_status(ticker, fiscal_year)
        if not status["pdf_available"] and not status["parsed_available"]:
            raise HTTPException(
                status_code=404,
                detail=f"No source document for {status['ticker']} {status['fiscal_year']}. "
                "Add data/raw/{TICKER}_FY25.pdf or run scripts/02_parse_pdfs.py.",
            )
        raise HTTPException(status_code=404, detail=f"Page {page} not found")

    return payload


@router.get("/documents/{ticker}/{fiscal_year}")
async def get_document(ticker: str, fiscal_year: str):
    path = pdf_path(ticker, fiscal_year)
    if not path.is_file():
        raise HTTPException(status_code=404, detail=f"Document not found: {path.name}")
    return FileResponse(
        path,
        media_type="application/pdf",
        filename=path.name,
        headers={"Accept-Ranges": "bytes"},
    )

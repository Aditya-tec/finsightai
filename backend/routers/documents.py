from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse, Response

from document_corpus import (
    document_status,
    get_page_content,
    normalize_fy,
    normalize_ticker,
    pdf_path,
)
from services.filing_storage import download_pdf_bytes

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
                "Upload PDFs to Supabase Storage or add data/raw/{TICKER}_FY25.pdf locally.",
            )
        raise HTTPException(status_code=404, detail=f"Page {page} not found")

    return payload


@router.get("/documents/{ticker}/{fiscal_year}")
async def get_document(ticker: str, fiscal_year: str):
    t = normalize_ticker(ticker)
    fy = normalize_fy(fiscal_year)
    filename = f"{t}_{fy}.pdf"
    path = pdf_path(ticker, fiscal_year)
    if path.is_file():
        return FileResponse(
            path,
            media_type="application/pdf",
            filename=filename,
            headers={"Accept-Ranges": "bytes"},
        )

    pdf_bytes = download_pdf_bytes(ticker, fiscal_year)
    if not pdf_bytes:
        raise HTTPException(status_code=404, detail=f"Document not found: {filename}")

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Accept-Ranges": "bytes",
            "Content-Disposition": f'inline; filename="{filename}"',
        },
    )

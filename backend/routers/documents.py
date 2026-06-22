from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from settings import settings

router = APIRouter()


def _pdf_path(ticker: str, fiscal_year: str) -> Path:
    fy = fiscal_year.upper().replace(" ", "")
    return Path(settings.raw_data_dir) / f"{ticker.upper()}_{fy}.pdf"


@router.get("/documents/{ticker}/{fiscal_year}")
async def get_document(ticker: str, fiscal_year: str):
    path = _pdf_path(ticker, fiscal_year)
    if not path.is_file():
        raise HTTPException(status_code=404, detail=f"Document not found: {path.name}")
    return FileResponse(
        path,
        media_type="application/pdf",
        filename=path.name,
        headers={"Accept-Ranges": "bytes"},
    )

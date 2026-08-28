"""Unit tests for Supabase filing storage helpers."""
from __future__ import annotations

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from services import filing_storage


def test_storage_object_names() -> None:
    assert filing_storage.storage_object_name("maruti", "fy25", kind="pdf") == "pdfs/MARUTI_FY25.pdf"
    assert (
        filing_storage.storage_object_name("TATAMOTERS", "FY25", kind="parsed")
        == "parsed/TATAMOTORS_FY25.json"
    )


def test_pdf_is_available_local(tmp_path, monkeypatch) -> None:
    import document_corpus
    from document_corpus import pdf_is_available
    from settings import settings

    raw = tmp_path / "raw"
    raw.mkdir()
    (raw / "DEMO_FY25.pdf").write_bytes(b"%PDF-1.4")

    monkeypatch.setattr(settings, "raw_data_dir", str(raw))
    monkeypatch.setattr(
        filing_storage,
        "pdf_available_in_storage",
        lambda _t, _fy: False,
    )
    assert pdf_is_available("DEMO", "FY25") is True


def test_document_status_storage_pdf(monkeypatch) -> None:
    import document_corpus
    from document_corpus import document_status

    monkeypatch.setattr(document_corpus, "pdf_path", lambda _t, _fy: Path("/nope/missing.pdf"))
    monkeypatch.setattr(document_corpus, "load_parsed_pages", lambda _t, _fy: [])
    monkeypatch.setattr(document_corpus, "_max_page_from_chunks", lambda _t, _fy: 42)
    monkeypatch.setattr(
        filing_storage,
        "pdf_available_in_storage",
        lambda _t, _fy: True,
    )
    monkeypatch.setattr(
        filing_storage,
        "parsed_available_in_storage",
        lambda _t, _fy: False,
    )

    status = document_status("MARUTI", "FY25")
    assert status["pdf_available"] is True
    assert status["storage_pdf"] is True
    assert status["page_count"] == 42

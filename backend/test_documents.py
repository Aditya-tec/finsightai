"""Tests for document corpus page lookup (run: python -m test_documents)."""
from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import document_corpus
from document_corpus import (
    document_status,
    get_page_content,
    load_parsed_pages,
    normalize_ticker,
    parsed_json_path,
    pdf_path,
)
from settings import settings


def _with_dirs(parsed_dir: Path, raw_dir: Path):
    class _Ctx:
        def __enter__(self):
            self.old_parsed = settings.parsed_data_dir
            self.old_raw = settings.raw_data_dir
            settings.parsed_data_dir = str(parsed_dir)
            settings.raw_data_dir = str(raw_dir)
            document_corpus._load_parsed_file.cache_clear()
            return self

        def __exit__(self, *args):
            settings.parsed_data_dir = self.old_parsed
            settings.raw_data_dir = self.old_raw
            document_corpus._load_parsed_file.cache_clear()

    return _Ctx()


def test_normalize_ticker_alias() -> None:
    assert normalize_ticker("TATAMOTERS") == "TATAMOTORS"


def test_page_lookup_exact_and_nearest(tmp_path: Path) -> None:
    root = tmp_path / "lookup"
    raw = root / "raw"
    raw.mkdir(parents=True)
    parsed = [
        {"page_number": 1, "text": "Cover page"},
        {"page_number": 3, "text": "Revenue grew 9%"},
        {"page_number": 5, "text": "Notes to accounts"},
    ]
    (root / "DEMO_FY25.json").write_text(json.dumps(parsed), encoding="utf-8")

    with _with_dirs(root, raw):
        exact = get_page_content("DEMO", "FY25", 3)
        assert exact is not None
        assert exact["page"] == 3
        assert exact["page_mismatch"] is False
        assert "Revenue" in exact["text"]

        nearest = get_page_content("DEMO", "FY25", 4)
        assert nearest is not None
        assert nearest["page"] in (3, 5)
        assert nearest["page_mismatch"] is True


def test_document_status_flags(tmp_path: Path) -> None:
    root = tmp_path / "status"
    raw = root / "raw"
    parsed = root / "parsed"
    raw.mkdir(parents=True)
    parsed.mkdir(parents=True)

    (raw / "ACME_FY25.pdf").write_bytes(b"%PDF-1.4 fake")
    (parsed / "ACME_FY25.json").write_text(
        json.dumps([{"page_number": 1, "text": "Hello"}]),
        encoding="utf-8",
    )

    with _with_dirs(parsed, raw):
        status = document_status("ACME", "FY25")
        assert status["pdf_available"] is True
        assert status["parsed_available"] is True
        assert status["page_count"] == 1


def test_missing_document_returns_none(tmp_path: Path) -> None:
    root = tmp_path / "missing"
    raw = root / "raw"
    raw.mkdir(parents=True)
    with _with_dirs(root, raw):
        assert get_page_content("MISSING", "FY25", 1) is None
        assert load_parsed_pages("MISSING", "FY25") == []


def test_path_helpers() -> None:
    assert pdf_path("tcs", "fy25").name == "TCS_FY25.pdf"
    assert parsed_json_path("tcs", "fy25").name == "TCS_FY25.json"


def test_pdf_only_page_returns_empty_text(tmp_path: Path) -> None:
    root = tmp_path / "pdfonly"
    raw = root / "raw"
    raw.mkdir(parents=True)
    (raw / "ONLYPDF_FY25.pdf").write_bytes(b"%PDF-1.4 fake")

    with _with_dirs(root, raw):
        payload = get_page_content("ONLYPDF", "FY25", 1)
        assert payload is not None
        assert payload["pdf_available"] is True
        assert payload["parsed_available"] is False
        assert payload["text"] == ""


if __name__ == "__main__":
    import tempfile

    test_normalize_ticker_alias()
    test_path_helpers()
    with tempfile.TemporaryDirectory() as tmp:
        base = Path(tmp)
        test_page_lookup_exact_and_nearest(base)
        test_document_status_flags(base)
        test_missing_document_returns_none(base)
        test_pdf_only_page_returns_empty_text(base)
    print("All document corpus checks passed.")

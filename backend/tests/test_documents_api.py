from __future__ import annotations

import json
from pathlib import Path

from fastapi.testclient import TestClient

import document_corpus
from main import app
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


def test_documents_status_and_page(tmp_path: Path) -> None:
    root = tmp_path / "docs"
    raw = root / "raw"
    raw.mkdir(parents=True)
    parsed = [{"page_number": 2, "text": "Segment revenue grew 12%"}]
    (root / "ACME_FY25.json").write_text(json.dumps(parsed), encoding="utf-8")

    client = TestClient(app)
    with _with_dirs(root, raw):
        status = client.get("/api/documents/ACME/FY25/status")
        assert status.status_code == 200
        assert status.json()["parsed_available"] is True

        page = client.get("/api/documents/ACME/FY25/pages/2")
        assert page.status_code == 200
        assert "Segment" in page.json()["text"]

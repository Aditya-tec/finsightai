from __future__ import annotations

import json
from pathlib import Path

import document_corpus
from agents.citation_validate import enrich_and_validate_citation, validate_citations
from document_corpus import get_page_content
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


def test_validate_citation_drops_invalid_page(tmp_path: Path) -> None:
    root = tmp_path / "citations"
    raw = root / "raw"
    raw.mkdir(parents=True)
    parsed = [{"page_number": 10, "text": "Revenue"}]
    (root / "DEMO_FY25.json").write_text(json.dumps(parsed), encoding="utf-8")

    with _with_dirs(root, raw):
        out = validate_citations([{"source": "filing", "page": 999, "section": "MD&A"}], "DEMO")
        assert out == []

        near = validate_citations([{"source": "filing", "page": 11, "section": "MD&A"}], "DEMO")
        assert len(near) == 1
        assert near[0]["page"] == 10
        assert near[0]["page_mismatch"] is True


def test_enrich_sets_document_key() -> None:
    c = enrich_and_validate_citation({"source": "filing", "page": 1}, "tcs")
    assert c["document_key"] == "TCS_FY25"
    assert c["ticker"] == "TCS"

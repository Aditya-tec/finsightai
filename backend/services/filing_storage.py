from __future__ import annotations

import logging
from functools import lru_cache
from typing import Any

from settings import settings

logger = logging.getLogger(__name__)

PDF_PREFIX = "pdfs"
PARSED_PREFIX = "parsed"
TICKER_ALIASES = {"TATAMOTERS": "TATAMOTORS"}


def _normalize_ticker(ticker: str) -> str:
    upper = ticker.upper().strip()
    return TICKER_ALIASES.get(upper, upper)


def _normalize_fy(fiscal_year: str) -> str:
    return fiscal_year.upper().replace(" ", "")


def _bucket() -> str:
    return settings.supabase_filings_bucket


def _client():
    if not settings.supabase_url or not settings.supabase_key:
        return None
    try:
        from supabase import create_client

        return create_client(settings.supabase_url, settings.supabase_key)
    except Exception as exc:
        logger.warning("Supabase client unavailable for filing storage: %s", exc)
        return None


def storage_object_name(ticker: str, fiscal_year: str, *, kind: str) -> str:
    t = _normalize_ticker(ticker)
    fy = _normalize_fy(fiscal_year)
    prefix = PDF_PREFIX if kind == "pdf" else PARSED_PREFIX
    ext = "pdf" if kind == "pdf" else "json"
    return f"{prefix}/{t}_{fy}.{ext}"


def clear_storage_cache() -> None:
    _object_exists.cache_clear()
    download_bytes.cache_clear()


@lru_cache(maxsize=256)
def _object_exists(object_path: str) -> bool:
    client = _client()
    if client is None:
        return False
    folder, _, name = object_path.rpartition("/")
    try:
        items: list[dict[str, Any]] = client.storage.from_(_bucket()).list(folder)
        return any(item.get("name") == name for item in items)
    except Exception as exc:
        logger.debug("Storage list failed for %s: %s", object_path, exc)
        return False


def pdf_available_in_storage(ticker: str, fiscal_year: str) -> bool:
    return _object_exists(storage_object_name(ticker, fiscal_year, kind="pdf"))


def parsed_available_in_storage(ticker: str, fiscal_year: str) -> bool:
    return _object_exists(storage_object_name(ticker, fiscal_year, kind="parsed"))


@lru_cache(maxsize=32)
def download_bytes(object_path: str) -> bytes | None:
    client = _client()
    if client is None:
        return None
    try:
        data = client.storage.from_(_bucket()).download(object_path)
        return bytes(data) if data else None
    except Exception as exc:
        logger.debug("Storage download failed for %s: %s", object_path, exc)
        return None


def download_pdf_bytes(ticker: str, fiscal_year: str) -> bytes | None:
    path = storage_object_name(ticker, fiscal_year, kind="pdf")
    if not _object_exists(path):
        return None
    return download_bytes(path)


def download_parsed_bytes(ticker: str, fiscal_year: str) -> bytes | None:
    path = storage_object_name(ticker, fiscal_year, kind="parsed")
    if not _object_exists(path):
        return None
    return download_bytes(path)


def upload_bytes(object_path: str, payload: bytes, content_type: str) -> bool:
    client = _client()
    if client is None:
        return False
    try:
        client.storage.from_(_bucket()).upload(
            object_path,
            payload,
            file_options={"content-type": content_type, "upsert": "true"},
        )
        clear_storage_cache()
        return True
    except Exception as exc:
        logger.exception("Storage upload failed for %s: %s", object_path, exc)
        return False

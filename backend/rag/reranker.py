from __future__ import annotations

import hashlib
import logging
from typing import Any

import cohere
from supabase import create_client

from settings import settings

logger = logging.getLogger("rupeeread.reranker")


def _cache_key(query: str, ticker: str | None = None) -> str:
    scope = (ticker or "").strip().upper()
    payload = f"{scope}\n{query.strip()}"
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _get_supabase():
    if not settings.supabase_url or not settings.supabase_key:
        return None
    return create_client(settings.supabase_url, settings.supabase_key)


def _read_cache(query: str, ticker: str | None = None) -> list[str] | None:
    client = _get_supabase()
    if client is None:
        return None
    h = _cache_key(query, ticker)
    rows = client.table("reranker_cache").select("*").eq("query_hash", h).limit(1).execute()
    if rows.data:
        return rows.data[0]["ranked_chunk_ids"]
    return None


def _write_cache(query: str, ranked_ids: list[str], ticker: str | None = None) -> None:
    client = _get_supabase()
    if client is None:
        return
    try:
        client.table("reranker_cache").upsert(
            {
                "query_hash": _cache_key(query, ticker),
                "query_text": query,
                "ranked_chunk_ids": ranked_ids,
            },
            on_conflict="query_hash",
        ).execute()
    except Exception as exc:
        logger.warning("reranker_cache write failed: %s", exc)


def rerank(
    query: str,
    chunks: list[dict[str, Any]],
    top_n: int = 5,
    *,
    ticker: str | None = None,
) -> list[dict[str, Any]]:
    if not chunks:
        return []

    cached_ids = _read_cache(query, ticker)
    if cached_ids:
        by_id = {str(c.get("id")): c for c in chunks if c.get("id")}
        ordered = [by_id[cid] for cid in cached_ids if cid in by_id]
        if ordered:
            return ordered[:top_n]

    if not settings.cohere_api_key:
        return chunks[:top_n]

    co = cohere.ClientV2(api_key=settings.cohere_api_key)
    documents = [c.get("content", "") for c in chunks]
    result = co.rerank(model="rerank-v3.5", query=query, documents=documents, top_n=top_n)

    ranked = []
    ranked_ids = []
    for item in result.results:
        chunk = chunks[item.index]
        row = chunk.copy()
        row["rerank_score"] = float(item.relevance_score)
        ranked.append(row)
        if row.get("id"):
            ranked_ids.append(str(row["id"]))
    if ranked_ids:
        _write_cache(query, ranked_ids, ticker)
    return ranked

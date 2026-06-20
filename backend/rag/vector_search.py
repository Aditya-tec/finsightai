from __future__ import annotations

import logging
from typing import Any

from supabase import create_client

from rag.search_errors import SearchIndexError
from settings import settings

logger = logging.getLogger(__name__)


def search_vectors(
    query_embedding: list[float], ticker: str | None = None, limit: int = 20
) -> list[dict[str, Any]]:
    if not settings.supabase_url or not settings.supabase_key:
        return []

    try:
        client = create_client(settings.supabase_url, settings.supabase_key)
        payload = {
            "query_embedding": query_embedding,
            "match_threshold": 0.2,
            "match_count": limit,
            "filter_ticker": ticker,
        }
        response = client.rpc("match_chunks", payload).execute()
        data = response.data if response and response.data else []
    except Exception as exc:
        logger.exception("Supabase vector search failed")
        raise SearchIndexError("Search index unavailable") from exc

    for row in data:
        row["retrieval_source"] = "vector"
    return data

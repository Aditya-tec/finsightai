from __future__ import annotations

from typing import Any

from supabase import create_client

from settings import settings


def search_vectors(
    query_embedding: list[float], ticker: str | None = None, limit: int = 20
) -> list[dict[str, Any]]:
    if not settings.supabase_url or not settings.supabase_key:
        return []

    client = create_client(settings.supabase_url, settings.supabase_key)
    payload = {
        "query_embedding": query_embedding,
        "match_threshold": 0.2,
        "match_count": limit,
        "filter_ticker": ticker,
    }
    response = client.rpc("match_chunks", payload).execute()
    data = response.data if response and response.data else []
    for row in data:
        row["retrieval_source"] = "vector"
    return data

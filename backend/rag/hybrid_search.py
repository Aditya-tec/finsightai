from __future__ import annotations

from collections import defaultdict
from typing import Any

from rag.bm25_search import search_bm25
from rag.embedder import embed_text
from rag.hyde import generate_hypothetical_answer
from rag.search_errors import SearchIndexError
from rag.vector_search import search_vectors


def _embedding_query(query: str) -> str:
    words = query.split()
    if len(words) > 6:
        return generate_hypothetical_answer(query)
    return query


def reciprocal_rank_fusion(rank_lists: list[list[dict[str, Any]]], k: int = 60) -> list[dict]:
    scores = defaultdict(float)
    rows = {}
    for ranking in rank_lists:
        for rank, row in enumerate(ranking, start=1):
            key = str(row.get("id") or hash(row.get("content", "")))
            scores[key] += 1.0 / (k + rank)
            rows[key] = row

    fused = []
    for key, score in scores.items():
        item = rows[key].copy()
        item["rrf_score"] = score
        fused.append(item)
    fused.sort(key=lambda x: x["rrf_score"], reverse=True)
    return fused


def hybrid_retrieve(query: str, ticker: str | None = None, limit: int = 20) -> list[dict]:
    query_embedding = embed_text(_embedding_query(query))
    vector_rows: list[dict] = []
    vector_failed = False
    try:
        vector_rows = search_vectors(query_embedding, ticker=ticker, limit=limit)
    except SearchIndexError:
        vector_failed = True

    bm25_rows = search_bm25(query, limit=limit, ticker=ticker)
    if vector_failed and not bm25_rows:
        raise SearchIndexError("Search index unavailable")

    return reciprocal_rank_fusion([vector_rows, bm25_rows])[:limit]

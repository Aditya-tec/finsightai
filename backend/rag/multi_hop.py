from __future__ import annotations

from rag.hybrid_search import hybrid_retrieve


def is_complex_query(query: str) -> bool:
    markers = ["why", "because", "impact", "drivers", "compare", "versus", "trend"]
    q = query.lower()
    return any(marker in q for marker in markers)


def run_multi_hop(
    query: str,
    ticker: str | None = None,
    subquestions: list[str] | None = None,
) -> list[dict]:
    combined: dict[str, dict] = {}
    hops = subquestions if subquestions else [query]
    for hop_query in hops[:5]:
        for chunk in hybrid_retrieve(hop_query, ticker=ticker, limit=10):
            key = str(chunk.get("id") or hash(chunk.get("content", "")))
            combined[key] = chunk
    if not combined:
        return []
    second_query = f"{query} management explanation and causal factors"
    for chunk in hybrid_retrieve(second_query, ticker=ticker, limit=10):
        key = str(chunk.get("id") or hash(chunk.get("content", "")))
        combined[key] = chunk
    return list(combined.values())[:15]

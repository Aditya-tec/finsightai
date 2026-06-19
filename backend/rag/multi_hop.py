from __future__ import annotations

from rag.hybrid_search import hybrid_retrieve


def is_complex_query(query: str) -> bool:
    markers = ["why", "because", "impact", "drivers", "compare", "versus", "trend"]
    q = query.lower()
    return any(marker in q for marker in markers)


def run_multi_hop(query: str, ticker: str | None = None) -> list[dict]:
    first_hop = hybrid_retrieve(query, ticker=ticker, limit=10)
    if not first_hop:
        return []
    second_query = f"{query} management explanation and causal factors"
    second_hop = hybrid_retrieve(second_query, ticker=ticker, limit=10)
    combined = {str(c.get('id') or i): c for i, c in enumerate(first_hop + second_hop)}
    return list(combined.values())[:15]

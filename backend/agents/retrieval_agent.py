from __future__ import annotations

from rag.graph_rag import enrich_with_graph
from rag.hybrid_search import hybrid_retrieve
from rag.multi_hop import is_complex_query, run_multi_hop
from rag.reranker import rerank
from rag.self_correction import filter_chunks


def retrieve_context(query: str, ticker: str | None = None, *, fast: bool = False) -> list[dict]:
    limit = 10 if fast else 20
    candidates = hybrid_retrieve(query, ticker=ticker, limit=limit)
    if fast:
        return candidates[:5]
    if is_complex_query(query):
        candidates = run_multi_hop(query, ticker=ticker)
    filtered = filter_chunks(query, candidates, threshold=0.5)
    ranked = rerank(query, filtered, top_n=5)
    return enrich_with_graph(ranked)

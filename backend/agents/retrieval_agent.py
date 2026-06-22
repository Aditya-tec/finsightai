from __future__ import annotations

from typing import Any

from agents.events import EventCallback, emit
from rag.graph_rag import enrich_with_graph
from rag.hybrid_search import hybrid_retrieve
from rag.multi_hop import is_complex_query, run_multi_hop
from rag.reranker import rerank
from rag.self_correction import filter_chunks


def retrieve_context(
    query: str,
    ticker: str | None = None,
    *,
    fast: bool = False,
    subquestions: list[str] | None = None,
    on_event: EventCallback | None = None,
) -> list[dict]:
    limit = 10 if fast else 20
    emit(on_event, "step", {"message": "Running hybrid retrieval…", "phase": "retrieval"})
    candidates = hybrid_retrieve(query, ticker=ticker, limit=limit)
    if fast:
        emit(on_event, "step", {"message": f"Fast retrieval returned {len(candidates)} chunks", "phase": "retrieval"})
        return candidates[:5]
    if is_complex_query(query):
        emit(on_event, "step", {"message": "Breaking query into sub-questions…", "phase": "multi_hop"})
        candidates = run_multi_hop(query, ticker=ticker, subquestions=subquestions)
    filtered = filter_chunks(query, candidates, threshold=0.5, on_event=on_event)
    emit(on_event, "step", {"message": "Running reranker…", "phase": "rerank"})
    ranked = rerank(query, filtered, top_n=5)
    emit(on_event, "step", {"message": "Enriching with graph neighbors…", "phase": "graph"})
    return enrich_with_graph(ranked)

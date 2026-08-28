from __future__ import annotations

from rag.reranker import _cache_key


def test_cache_key_differs_by_ticker() -> None:
    query = "compare the projections of tcs vs wipro"
    assert _cache_key(query, "TCS") != _cache_key(query, "WIPRO")


def test_cache_key_same_for_same_scope() -> None:
    query = "What was revenue in FY25?"
    assert _cache_key(query, "tcs") == _cache_key(query, "TCS")

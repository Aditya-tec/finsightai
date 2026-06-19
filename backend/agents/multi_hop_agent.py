from __future__ import annotations

from rag.multi_hop import run_multi_hop


def run(query: str, ticker: str | None = None) -> list[dict]:
    return run_multi_hop(query=query, ticker=ticker)

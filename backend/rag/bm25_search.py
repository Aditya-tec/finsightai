from __future__ import annotations

import os
import pickle
from typing import Any

from rank_bm25 import BM25Okapi

from settings import settings


def _tokenize(text: str) -> list[str]:
    return text.lower().split()


def load_bm25_index() -> dict[str, Any] | None:
    if not os.path.exists(settings.bm25_index_path):
        return None
    with open(settings.bm25_index_path, "rb") as f:
        return pickle.load(f)


def search_bm25(query: str, limit: int = 20, ticker: str | None = None) -> list[dict]:
    payload = load_bm25_index()
    if not payload:
        return []

    corpus_tokens = payload["tokens"]
    docs = payload["docs"]
    bm25 = BM25Okapi(corpus_tokens)
    scores = bm25.get_scores(_tokenize(query))

    scored = []
    for i, score in enumerate(scores):
        item = docs[i]
        if ticker and item.get("ticker") != ticker:
            continue
        scored.append({**item, "similarity": float(score), "retrieval_source": "bm25"})

    scored.sort(key=lambda x: x["similarity"], reverse=True)
    return scored[:limit]

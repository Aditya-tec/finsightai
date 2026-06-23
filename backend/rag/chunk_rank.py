from __future__ import annotations

import re

_FINANCIAL_SECTION = re.compile(
    r"management discussion|financial statement|notes to|consolidated|profit and loss|balance sheet",
    re.IGNORECASE,
)


def _word_count(chunk: dict) -> int:
    return len(str(chunk.get("content", "")).split())


def boost_chunks(chunks: list[dict], query: str, *, financial_query: bool = False) -> list[dict]:
    """Re-rank retrieved chunks with lightweight heuristics (no re-embed)."""
    if not chunks:
        return chunks

    scored: list[tuple[float, dict]] = []
    for chunk in chunks:
        score = float(chunk.get("rrf_score") or chunk.get("similarity") or 0.5)
        meta = chunk.get("metadata") or {}
        basis = meta.get("basis") if isinstance(meta, dict) else None
        section = str(chunk.get("section_title") or "")

        if financial_query and basis == "consolidated":
            score += 0.15
        if _FINANCIAL_SECTION.search(section):
            score += 0.1
        wc = _word_count(chunk)
        if wc < 50:
            score -= 0.2
        elif wc > 120:
            score += 0.05

        item = chunk.copy()
        item["_boost_score"] = score
        scored.append((score, item))

    scored.sort(key=lambda x: x[0], reverse=True)
    return [c for _, c in scored]

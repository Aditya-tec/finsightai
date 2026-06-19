from __future__ import annotations


def citation_accuracy(citations: list[dict]) -> float:
    if not citations:
        return 0.0
    valid = 0
    for c in citations:
        if c.get("source"):
            valid += 1
    return round(valid / len(citations), 2)

from __future__ import annotations


def score_relevance(query: str, answer: str) -> float:
    q_tokens = set(query.lower().split())
    a_tokens = set(answer.lower().split())
    if not q_tokens:
        return 0.0
    return round(len(q_tokens.intersection(a_tokens)) / len(q_tokens), 2)

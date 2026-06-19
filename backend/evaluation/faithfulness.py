from __future__ import annotations


def score_faithfulness(answer: str, context: list[dict]) -> float:
    if not answer.strip() or not context:
        return 0.0
    supported_tokens = 0
    total_tokens = 0
    joined_context = " ".join(c.get("content", "").lower() for c in context)
    for token in answer.lower().split():
        total_tokens += 1
        if token in joined_context:
            supported_tokens += 1
    if total_tokens == 0:
        return 0.0
    return round(supported_tokens / total_tokens, 2)

from __future__ import annotations

from evaluation.text_normalize import normalize_text_for_match


def score_faithfulness(answer: str, context: list[dict]) -> float:
    if not answer.strip() or not context:
        return 0.0
    joined_context = normalize_text_for_match(" ".join(c.get("content", "") for c in context))
    supported_tokens = 0
    total_tokens = 0
    for token in answer.split():
        normalized = normalize_text_for_match(token)
        if not normalized:
            continue
        total_tokens += 1
        if normalized in joined_context:
            supported_tokens += 1
    if total_tokens == 0:
        return 0.0
    return round(supported_tokens / total_tokens, 2)

from __future__ import annotations

import re
from typing import Any

from evaluation.text_normalize import normalize_text_for_match


def _sentence_support(sentence: str, context: str) -> float:
    tokens = [normalize_text_for_match(t) for t in sentence.split()]
    tokens = [t for t in tokens if t and len(t) > 2]
    if not tokens:
        return 1.0
    supported = sum(1 for t in tokens if t in context)
    return supported / len(tokens)


def score_faithfulness(answer: str, context: list[dict]) -> dict[str, Any]:
    if not answer.strip() or not context:
        return {"score": 0.0, "unsupported_sentences": []}
    joined_context = normalize_text_for_match(" ".join(c.get("content", "") for c in context))
    sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", answer) if s.strip()]
    if not sentences:
        sentences = [answer.strip()]
    scores: list[float] = []
    unsupported: list[str] = []
    for sentence in sentences:
        s = _sentence_support(sentence, joined_context)
        scores.append(s)
        if s < 0.5 and len(sentence) > 20:
            unsupported.append(sentence[:200])
    avg = round(sum(scores) / len(scores), 2) if scores else 0.0
    return {"score": avg, "unsupported_sentences": unsupported[:5]}

from __future__ import annotations

from evaluation.text_normalize import extract_normalized_numbers


def detect_hallucinations(answer: str, context: list[dict]) -> dict:
    answer_numbers = extract_normalized_numbers(answer)
    context_blob = " ".join(c.get("content", "") for c in context)
    context_numbers = extract_normalized_numbers(context_blob)
    missing = sorted(n for n in answer_numbers if n not in context_numbers)
    return {
        "hallucination_detected": 1 if missing else 0,
        "hallucination_flags": missing[:20],
    }

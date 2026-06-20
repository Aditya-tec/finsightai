from __future__ import annotations

from evaluation.text_normalize import (
    extract_normalized_numbers,
    is_number_grounded_in_answer,
    is_orphan_year_fragment,
)


def detect_hallucinations(answer: str, context: list[dict]) -> dict:
    answer_numbers = extract_normalized_numbers(answer)
    context_blob = " ".join(c.get("content", "") for c in context)
    context_numbers = extract_normalized_numbers(context_blob)
    missing = sorted(
        n
        for n in answer_numbers
        if not is_number_grounded_in_answer(n, answer, context_blob, context_numbers)
        and not is_orphan_year_fragment(n, context_blob, answer)
    )
    return {
        "hallucination_detected": 1 if missing else 0,
        "hallucination_flags": missing[:20],
    }

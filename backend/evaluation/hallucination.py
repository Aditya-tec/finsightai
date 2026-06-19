from __future__ import annotations

import re


def detect_hallucinations(answer: str, context: list[dict]) -> dict:
    numbers = re.findall(r"\b\d+(?:\.\d+)?%?\b", answer)
    context_blob = " ".join(c.get("content", "") for c in context)
    missing = [n for n in numbers if n not in context_blob]
    return {
        "hallucination_detected": 1 if missing else 0,
        "hallucination_flags": missing[:20],
    }

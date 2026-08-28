from __future__ import annotations

import json
import re
from typing import Any

from groq import Groq, RateLimitError

from settings import settings

JUDGE_PROMPT = """
You are a harsh, adversarial fact-checker.
Query: {query}
Chunk: {chunk}

Find reasons this chunk does NOT answer the query.
Be critical. Score 0 (useless) to 1 (perfectly relevant).
Return only JSON: {{"score": 0.0, "reason": "..."}}
"""


def _parse_judge_response(text: str) -> tuple[float, str]:
    text = text.strip()
    try:
        data = json.loads(text)
        return float(data.get("score", 0.5)), str(data.get("reason", ""))
    except (json.JSONDecodeError, TypeError, ValueError):
        pass
    match = re.search(r'"score"\s*:\s*([\d.]+)', text)
    reason_match = re.search(r'"reason"\s*:\s*"([^"]*)"', text)
    score = float(match.group(1)) if match else 0.5
    reason = reason_match.group(1) if reason_match else ""
    return score, reason


def _score_chunk_with_llm(query: str, chunk: str) -> tuple[float, str, bool]:
    if not settings.groq_api_key:
        return 0.8, "no api key", False
    client = Groq(api_key=settings.groq_api_key)
    try:
        reply = client.chat.completions.create(
            model=settings.groq_report_model,
            messages=[{"role": "user", "content": JUDGE_PROMPT.format(query=query, chunk=chunk[:2000])}],
            temperature=0.0,
            reasoning_effort="low",
        )
    except RateLimitError:
        return 0.0, "rate limited", True
    text = reply.choices[0].message.content or '{"score":0.5,"reason":""}'
    score, reason = _parse_judge_response(text)
    return score, reason, False


def filter_chunks(
    query: str,
    chunks: list[dict],
    threshold: float = 0.5,
    max_judge: int = 8,
    on_event: Any = None,
) -> list[dict]:
    from agents.events import emit

    kept: list[dict] = []
    rate_limited = False
    for chunk in chunks[:max_judge]:
        score, reason, limited = _score_chunk_with_llm(query, chunk.get("content", ""))
        if limited:
            rate_limited = True
            break
        if score >= threshold:
            row = chunk.copy()
            row["judge_score"] = score
            row["judge_reason"] = reason
            kept.append(row)
    if rate_limited:
        emit(on_event, "step", {"message": "Judge skipped (rate limit) — using top retrieval results", "phase": "self_correction"})
        return chunks[:5]
    if not kept and chunks:
        return chunks[:5]
    emit(on_event, "step", {"message": f"Judge kept {len(kept)}/{min(len(chunks), max_judge)} chunks", "phase": "self_correction"})
    return kept

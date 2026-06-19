from __future__ import annotations

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


def _score_chunk_with_llm(query: str, chunk: str) -> float:
    if not settings.groq_api_key:
        return 0.8
    client = Groq(api_key=settings.groq_api_key)
    try:
        reply = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": JUDGE_PROMPT.format(query=query, chunk=chunk)}],
            temperature=0.0,
        )
    except RateLimitError:
        return 0.8
    text = reply.choices[0].message.content or '{"score":0.5}'
    try:
        return float(text.split('"score"')[1].split(":")[1].split(",")[0].replace("}", "").strip())
    except (ValueError, IndexError):
        return 0.5


def filter_chunks(query: str, chunks: list[dict], threshold: float = 0.5, max_judge: int = 5) -> list[dict]:
    kept = []
    for chunk in chunks[:max_judge]:
        score = _score_chunk_with_llm(query, chunk.get("content", ""))
        if score >= threshold:
            row = chunk.copy()
            row["judge_score"] = score
            kept.append(row)
    if not kept and chunks:
        return chunks[:5]
    return kept

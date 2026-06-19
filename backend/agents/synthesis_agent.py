from __future__ import annotations

from typing import Any

from groq import Groq, RateLimitError

from settings import settings


def _fallback_answer(query: str, context: list[dict[str, Any]]) -> str:
    preview = "\n".join(f"- {c.get('content', '')[:180]}" for c in context[:5])
    return (
        f"Query: {query}\n\n"
        "Draft grounded answer (fallback mode):\n"
        f"{preview if preview else '- No indexed context yet. Run ingestion first.'}"
    )


def synthesize_answer(query: str, context: list[dict[str, Any]], memory: str = "") -> str:
    if not settings.groq_api_key:
        return _fallback_answer(query, context)

    content = "\n\n".join(c.get("content", "") for c in context[:8])
    prompt = (
        "You are an equity research assistant. Answer only from provided context.\n"
        "If information is missing, say so clearly.\n\n"
        f"Memory context:\n{memory}\n\n"
        f"Retrieved context:\n{content}\n\n"
        f"Question: {query}\n"
        "Return concise analysis with factual tone."
    )
    client = Groq(api_key=settings.groq_api_key)
    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
        )
    except RateLimitError:
        return _fallback_answer(query, context)
    return response.choices[0].message.content or _fallback_answer(query, context)

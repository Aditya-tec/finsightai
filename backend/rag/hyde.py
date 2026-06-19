from __future__ import annotations

from groq import Groq

from settings import settings


def generate_hypothetical_answer(query: str) -> str:
    if not settings.groq_api_key:
        return f"Hypothetical financial answer for: {query}"

    client = Groq(api_key=settings.groq_api_key)
    prompt = (
        "Write a concise and factual hypothetical answer to improve retrieval.\n"
        f"Question: {query}\n"
        "Return 4-6 bullet points with financial terms."
    )
    completion = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.1,
    )
    return completion.choices[0].message.content or query

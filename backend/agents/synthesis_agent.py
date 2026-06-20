from __future__ import annotations

from typing import Any

from groq import Groq, RateLimitError

from agents.generic_query import CLARIFYING_MESSAGE, is_generic_broad_query
from settings import settings

META_QUERY_MARKERS = (
    "what is this report",
    "what's this report",
    "what is the report",
    "summarize this report",
    "summary of this report",
    "summary of the report",
    "what does this report",
    "what do this report",
    "overview of this report",
    "overview of the report",
    "tell me about this report",
    "explain this report",
    "what is this about",
    "what's this about",
    "describe this report",
)


def is_report_meta_query(query: str) -> bool:
    q = " ".join(query.lower().strip().rstrip("?.!").split())
    if any(marker in q for marker in META_QUERY_MARKERS):
        return True
    if "report" in q and len(q.split()) <= 14:
        if any(
            word in q
            for word in ("about", "summary", "summarize", "overview", "cover", "contains", "explain")
        ):
            return True
    return False


def offline_report_summary(report_context: str) -> str:
    blocks = [block.strip() for block in report_context.split("\n\n") if block.strip()]
    intro = "This is an 11-section equity analyst report for the company shown on this page."
    for block in blocks:
        lower = block.lower()
        if lower.startswith("executive summary") or "investment thesis" in lower[:120]:
            _, _, body = block.partition(": ")
            body = (body.strip() or block).strip()
            if len(body) > 1200:
                return f"{intro}\n\n{body[:1200].rstrip()}…"
            return f"{intro}\n\n{body}"
    if blocks:
        first = blocks[0]
        _, _, body = first.partition(": ")
        body = (body.strip() or first).strip()
        if len(body) > 900:
            body = f"{body[:900].rstrip()}…"
        return f"{intro}\n\n{body}"
    return (
        f"{intro} It covers executive summary, financial performance, risks, valuation, "
        "and investment thesis. Ask about a specific section for more detail."
    )


def _unavailable_message(
    *,
    rate_limited: bool,
    has_report: bool,
    query: str,
    report_context: str,
) -> str:
    if has_report and is_report_meta_query(query):
        return offline_report_summary(report_context)
    if rate_limited:
        return (
            "Live analysis is temporarily unavailable due to API rate limits. "
            "Please wait a few minutes and try again, or ask about a specific section "
            "(e.g. financial performance, risks, or revenue)."
        )
    if has_report:
        return (
            "I couldn't generate a live answer right now. The full report is on this page — "
            "try asking about a specific section such as risks, financials, or the investment thesis."
        )
    return (
        "I couldn't generate an answer right now. Please try again in a few minutes, "
        "or ask a more specific question about the company's financials."
    )


def _build_prompt(
    query: str,
    context: list[dict[str, Any]],
    memory: str,
    report_context: str,
    *,
    generic_query: bool = False,
) -> str:
    parts = [
        "You are an equity research assistant helping a user reading an on-screen analyst report.",
        "Answer only from the provided context. If information is missing, say so clearly.",
        "Do not mention internal systems, fallback modes, or retrieval mechanics.",
    ]
    if generic_query:
        parts.append(
            "The user asked a broad, high-level question about how the company is doing. "
            "Respond with a concise summary (2-4 short paragraphs max) covering the most central "
            "financial facts available: total income/revenue, profit/PAT, and notable growth trends. "
            "Write like an executive summary — specific numbers where the context supports them. "
            "Do not tell the user to read the source document themselves."
        )
    if report_context:
        parts.append(
            "For questions about the report itself (summary, scope, sections), use the on-screen "
            "report sections as your primary source — not raw filing fragments."
        )
        trimmed = report_context[:14000]
        parts.append(f"On-screen equity report:\n{trimmed}")
    if memory:
        parts.append(f"Recent conversation:\n{memory}")
    content = "\n\n".join(c.get("content", "") for c in context[:8] if c.get("content"))
    if content:
        parts.append(f"Retrieved filing excerpts (for company-specific facts):\n{content}")
    parts.append(f"Question: {query}")
    parts.append("Return a concise, user-facing answer with a factual tone.")
    return "\n\n".join(parts)


def synthesize_answer(
    query: str,
    context: list[dict[str, Any]],
    memory: str = "",
    *,
    report_context: str = "",
    generic_query: bool = False,
) -> str:
    has_report = bool(report_context.strip())
    generic_query = generic_query or is_generic_broad_query(query)

    if generic_query and not has_report and not context:
        return CLARIFYING_MESSAGE

    if has_report and is_report_meta_query(query) and not settings.groq_api_key:
        return offline_report_summary(report_context)

    if generic_query and has_report and not settings.groq_api_key:
        return offline_report_summary(report_context)

    if not settings.groq_api_key:
        return _unavailable_message(rate_limited=False, has_report=has_report, query=query, report_context=report_context)

    prompt = _build_prompt(
        query, context, memory, report_context, generic_query=generic_query
    )
    client = Groq(api_key=settings.groq_api_key)
    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
        )
    except RateLimitError:
        return _unavailable_message(
            rate_limited=True,
            has_report=has_report,
            query=query,
            report_context=report_context,
        )

    text = (response.choices[0].message.content or "").strip()
    if text:
        return text

    return _unavailable_message(
        rate_limited=False,
        has_report=has_report,
        query=query,
        report_context=report_context,
    )

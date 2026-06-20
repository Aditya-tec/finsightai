from __future__ import annotations

from groq import Groq, RateLimitError

from rag.hybrid_search import hybrid_retrieve
from schemas import Citation, ReportSection
from settings import settings

REPORT_SECTIONS = [
    "Executive Summary + Investment Thesis",
    "Financial Performance",
    "Balance Sheet Health + Cash Flow",
    "Key Risks",
    "Management Commentary",
]

SECTION_QUERIES = {
    "Executive Summary + Investment Thesis": "executive summary investment thesis revenue profit outlook",
    "Financial Performance": "revenue profit net income EBITDA financial performance results",
    "Balance Sheet Health + Cash Flow": "balance sheet assets liabilities cash flow debt equity",
    "Key Risks": "risks regulatory competition market risks challenges",
    "Management Commentary": "management discussion MD&A outlook strategy guidance commentary",
}

CONTEXT_CHUNKS = 3
MAX_OUTPUT_TOKENS = 300

_report_cache: dict[str, list[ReportSection]] = {}


def _rank_chunks(chunks: list[dict], query: str, top_n: int = CONTEXT_CHUNKS) -> list[dict]:
    terms = [t for t in query.lower().split() if len(t) > 2]
    if not terms:
        return chunks[:top_n]

    def score(chunk: dict) -> int:
        text = f"{chunk.get('content', '')} {chunk.get('section_title', '')}".lower()
        return sum(text.count(term) for term in terms)

    ranked = sorted(chunks, key=score, reverse=True)
    return ranked[:top_n]


def _write_section(title: str, ticker: str, context: list[dict]) -> str:
    if not context:
        return f"No filing data indexed for {ticker} yet."

    if not settings.groq_api_key:
        preview = "\n\n".join(c.get("content", "")[:300] for c in context[:CONTEXT_CHUNKS])
        return preview or "No indexed content available."

    content_blob = "\n\n".join(c.get("content", "") for c in context[:CONTEXT_CHUNKS])
    prompt = (
        f"You are a senior equity research analyst writing a professional report on {ticker}.\n"
        f"Write the '{title}' section of the report.\n"
        "Base your analysis ONLY on the retrieved filing excerpts below.\n"
        "Use specific numbers, dates, and facts from the context.\n"
        "If certain information is not present in the context, say so briefly rather than inventing data.\n"
        "Write 1-2 concise paragraphs in a professional analyst tone.\n\n"
        f"Filing excerpts:\n{content_blob}\n\n"
        f"Write the '{title}' section now:"
    )
    client = Groq(api_key=settings.groq_api_key)
    try:
        response = client.chat.completions.create(
            model=settings.groq_report_model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
            max_tokens=MAX_OUTPUT_TOKENS,
        )
    except RateLimitError as exc:
        raise exc
    return response.choices[0].message.content or "Content unavailable."


def _build_section(title: str, ticker: str, pool: list[dict]) -> ReportSection:
    query = SECTION_QUERIES.get(title, title)
    section_context = _rank_chunks(pool, query)
    body = _write_section(title, ticker, section_context)
    citations = [
        Citation(
            source=c.get("doc_type", "filing"),
            page=c.get("page_number"),
            section=c.get("section_title"),
        )
        for c in section_context[:CONTEXT_CHUNKS]
    ]
    return ReportSection(title=title, body=body, citations=citations)


def build_report(ticker: str) -> list[ReportSection]:
    cache_key = ticker.upper()
    if cache_key in _report_cache:
        return _report_cache[cache_key]

    pool = hybrid_retrieve(
        f"{ticker} annual report revenue profit balance sheet risks management outlook",
        ticker=ticker,
        limit=20,
    )
    sections = [_build_section(title, ticker, pool) for title in REPORT_SECTIONS]
    _report_cache[cache_key] = sections
    return sections

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

from groq import Groq, RateLimitError

from agents.chart_data import CHART_SECTIONS, SECTION_BUSINESS, SECTION_FINANCIAL
from agents.report_section_parse import parse_section_json
from rag.hybrid_search import hybrid_retrieve
from schemas import Citation, ReportSection
from settings import BASE_DIR, settings

REPORT_SECTIONS = [
    "Executive Summary + Investment Thesis",
    "Business Overview + Segment Breakdown",
    "Financial Performance",
    "Balance Sheet Health + Cash Flow",
    "Key Financial Ratios",
    "Valuation Snapshot vs Sector Median",
    "Management Commentary",
    "Key Risks",
    "Recent Developments",
    "Bull vs Bear vs Base Case",
    "Peer Comparison",
]

SECTION_QUERIES = {
    "Executive Summary + Investment Thesis": "executive summary investment thesis revenue profit outlook",
    "Business Overview + Segment Breakdown": "business segments products services operations overview",
    "Financial Performance": "revenue profit net income EBITDA financial performance results",
    "Balance Sheet Health + Cash Flow": "balance sheet assets liabilities cash flow debt equity",
    "Key Financial Ratios": "EPS ROE ROA margins financial ratios",
    "Valuation Snapshot vs Sector Median": "PE ratio EV EBITDA valuation market cap price earnings",
    "Management Commentary": "management discussion MD&A outlook strategy guidance commentary",
    "Key Risks": "risks regulatory competition market risks challenges",
    "Recent Developments": "recent developments acquisitions partnerships new products launches",
    "Bull vs Bear vs Base Case": "growth drivers upside downside scenario outlook forecast",
    "Peer Comparison": "peers competitors comparison sector industry benchmark",
}

CONTEXT_CHUNKS = 3
MAX_OUTPUT_TOKENS = 425
MAX_CHART_OUTPUT_TOKENS = 700
_CACHE_VERSION = "v6-charts"

_report_cache: dict[str, tuple[list[ReportSection], list[dict], str | None]] = {}


def cache_dir() -> Path:
    return BASE_DIR / "data" / "report_cache" / _CACHE_VERSION


def disk_cache_path(ticker: str) -> Path:
    return cache_dir() / f"{ticker.upper()}.json"


def disk_cache_exists(ticker: str) -> bool:
    return disk_cache_path(ticker).is_file()


def _chunk_key(chunk: dict) -> str:
    return str(chunk.get("id") or hash(chunk.get("content", "")))


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _mtime_iso(path: Path) -> str:
    return datetime.fromtimestamp(path.stat().st_mtime, tz=timezone.utc).isoformat()


def invalidate_report_cache(ticker: str) -> None:
    cache_key = f"{_CACHE_VERSION}:{ticker.upper()}"
    _report_cache.pop(cache_key, None)


def _serialize_result(sections: list[ReportSection], eval_context: list[dict]) -> dict:
    return {
        "sections": [s.model_dump() for s in sections],
        "eval_context": eval_context,
        "generated_at": _now_iso(),
    }


def _deserialize_result(data: dict) -> tuple[list[ReportSection], list[dict]]:
    sections = [ReportSection.model_validate(s) for s in data["sections"]]
    eval_context = data.get("eval_context", [])
    return sections, eval_context


def _load_disk_cache(ticker: str) -> tuple[list[ReportSection], list[dict], str | None] | None:
    path = disk_cache_path(ticker)
    if not path.is_file():
        return None
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        sections, eval_context = _deserialize_result(data)
        generated_at = data.get("generated_at") or _mtime_iso(path)
        return sections, eval_context, generated_at
    except (json.JSONDecodeError, KeyError, ValueError):
        return None


def _save_disk_cache(
    ticker: str, sections: list[ReportSection], eval_context: list[dict]
) -> str:
    path = disk_cache_path(ticker)
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = _serialize_result(sections, eval_context)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    return payload["generated_at"]


def _rank_chunks(chunks: list[dict], query: str, top_n: int = CONTEXT_CHUNKS) -> list[dict]:
    terms = [t for t in query.lower().split() if len(t) > 2]
    if not terms:
        return chunks[:top_n]

    def score(chunk: dict) -> int:
        text = f"{chunk.get('content', '')} {chunk.get('section_title', '')}".lower()
        return sum(text.count(term) for term in terms)

    ranked = sorted(chunks, key=score, reverse=True)
    return ranked[:top_n]


def _base_section_instructions(ticker: str, title: str) -> str:
    return (
        f"You are a senior equity research analyst writing a professional report on {ticker}.\n"
        f"Write the '{title}' section of the report.\n"
        "Base your analysis ONLY on the retrieved filing excerpts below.\n"
        "Use specific numbers, dates, and facts from the context.\n"
        "For Indian listed companies, express monetary amounts in INR using ₹ (rupee symbol). "
        "Do not use $. Match the currency style of the source excerpts.\n"
        "CRITICAL — filing unit scales: Indian annual reports often label table units as "
        "` in '000s (thousands of rupees), ` in million, ₹ in crore, or ₹ in lakh. "
        "Always read the unit header before quoting any figure. Convert to a consistent "
        "analyst-friendly format (₹X.XX billion for large amounts, or ₹X crore where appropriate). "
        "NEVER copy a large comma-grouped integer verbatim without applying the table's unit scale — "
        "e.g. TOTAL INCOME 2,945,869,343 with header ` in '000s` is ₹2,945.87 billion, "
        "NOT ₹2,945,869,343.\n"
        "Be precise with financial terminology: net profit (PAT) and net worth (shareholders' equity) "
        "are distinct — never label one as the other.\n"
        "When citing revenue, label the basis explicitly (e.g. segment revenue, revenue from operations "
        "net of GST, or consolidated total) — do not mix bases across sections.\n"
        "If reusing a metric cited elsewhere in the report, use the same figure and basis label.\n"
        "Do not compute ratios or percentages unless they appear verbatim in the excerpts; if you must "
        'derive one, show the formula inline (e.g. "3.17× = ₹46,128cr ÷ ₹14,562cr").\n'
        "If certain information is not present in the context, say so briefly rather than inventing data.\n"
        "For Peer Comparison: do not substitute the subject company's own consolidated line items "
        "as peer benchmarks — if peer data is absent, state that comparison is not possible.\n"
        "Write 1-2 concise paragraphs in a professional analyst tone.\n"
    )


def _chart_json_instructions(title: str) -> str:
    if title == SECTION_FINANCIAL:
        return (
            "\nAlso populate chart_data for a grouped bar chart ONLY if BOTH FY24 and FY25 values "
            "for revenue (or total income) AND net profit (PAT) are clearly available in the excerpts "
            "with consistent units (use ₹ crore for chart values). "
            "chart_data schema:\n"
            '{"type":"bar","labels":["FY24","FY25"],"datasets":['
            '{"label":"Revenue (₹ Cr)","values":[FY24_rev,FY25_rev]},'
            '{"label":"Net Profit (₹ Cr)","values":[FY24_pat,FY25_pat]}]}\n'
            "If either year or metric is missing or units are inconsistent, set chart_data to null. "
            "Never fabricate chart numbers.\n"
        )
    if title == SECTION_BUSINESS:
        return (
            "\nAlso populate chart_data for a segment donut chart ONLY if explicit segment revenue "
            "figures are stated in the excerpts with consistent units (use ₹ crore). "
            "chart_data schema:\n"
            '{"type":"donut","segments":[{"label":"Segment Name","value":12345},...]}\n'
            "Include at least 2 segments. If segment breakdown is unavailable or units differ, "
            "set chart_data to null. Never fabricate chart numbers.\n"
        )
    return ""


def _write_section_with_chart(
    title: str, ticker: str, context: list[dict]
) -> tuple[str, dict | None]:
    if not context:
        return f"No filing data indexed for {ticker} yet.", None

    if not settings.groq_api_key:
        preview = "\n\n".join(c.get("content", "")[:300] for c in context[:CONTEXT_CHUNKS])
        return preview or "No indexed content available.", None

    content_blob = "\n\n".join(c.get("content", "") for c in context[:CONTEXT_CHUNKS])
    prompt = (
        _base_section_instructions(ticker, title)
        + _chart_json_instructions(title)
        + "\nReturn ONLY valid JSON with no markdown fences:\n"
        '{"body": "<section prose>", "chart_data": <object or null>}\n\n'
        f"Filing excerpts:\n{content_blob}\n\n"
        f"Write the '{title}' section now as JSON:"
    )
    client = Groq(api_key=settings.groq_api_key)
    try:
        response = client.chat.completions.create(
            model=settings.groq_report_model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
            max_tokens=MAX_CHART_OUTPUT_TOKENS,
        )
    except RateLimitError as exc:
        raise exc
    return parse_section_json(response.choices[0].message.content or "", title)


def _write_section(title: str, ticker: str, context: list[dict]) -> str:
    if not context:
        return f"No filing data indexed for {ticker} yet."

    if not settings.groq_api_key:
        preview = "\n\n".join(c.get("content", "")[:300] for c in context[:CONTEXT_CHUNKS])
        return preview or "No indexed content available."

    content_blob = "\n\n".join(c.get("content", "") for c in context[:CONTEXT_CHUNKS])
    prompt = (
        _base_section_instructions(ticker, title)
        + "\n"
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


def build_report(
    ticker: str, *, force_refresh: bool = False
) -> tuple[list[ReportSection], list[dict], str | None]:
    cache_key = f"{_CACHE_VERSION}:{ticker.upper()}"

    if force_refresh:
        invalidate_report_cache(ticker)
    elif cache_key in _report_cache:
        return _report_cache[cache_key]

    if not force_refresh:
        disk_result = _load_disk_cache(ticker)
        if disk_result is not None:
            _report_cache[cache_key] = disk_result
            return disk_result

    pool = hybrid_retrieve(
        f"{ticker} annual report revenue profit balance sheet risks management segments outlook",
        ticker=ticker,
        limit=20,
    )
    eval_context: list[dict] = []
    seen: set[str] = set()

    def _track(chunks: list[dict]) -> None:
        for chunk in chunks:
            key = _chunk_key(chunk)
            if key not in seen:
                seen.add(key)
                eval_context.append(chunk)

    _track(pool)
    sections: list[ReportSection] = []
    for title in REPORT_SECTIONS:
        query = SECTION_QUERIES.get(title, title)
        section_context = _rank_chunks(pool, query)
        _track(section_context)
        chart_data: dict | None = None
        if title in CHART_SECTIONS:
            body, chart_data = _write_section_with_chart(title, ticker, section_context)
        else:
            body = _write_section(title, ticker, section_context)
        citations = [
            Citation(
                source=c.get("doc_type", "filing"),
                page=c.get("page_number"),
                section=c.get("section_title"),
            )
            for c in section_context[:CONTEXT_CHUNKS]
        ]
        sections.append(
            ReportSection(title=title, body=body, citations=citations, chart_data=chart_data)
        )

    generated_at = _save_disk_cache(ticker, sections, eval_context)
    result = (sections, eval_context, generated_at)
    _report_cache[cache_key] = result
    return result

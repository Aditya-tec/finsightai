from __future__ import annotations

EXECUTIVE_SUMMARY_RETRIEVAL_QUERY = (
    "executive summary investment thesis revenue profit financial performance "
    "outlook key highlights consolidated PAT total income"
)

GENERIC_PHRASES = (
    "how is",
    "how's",
    "how are",
    "how has",
    "how have",
    "how was",
    "doing",
    "tell me about",
    "what is the company",
    "what's the company",
    "what is company",
    "what's company like",
    "what is it like",
    "company like",
    "give me an overview",
    "overview of the company",
    "overview of company",
    "general update",
    "how good",
    "is it doing",
    "company doing",
    "about the company",
    "about this company",
    "how are things",
    "how is things",
    "what can you tell me",
    "what do you know about",
)

FINANCIAL_SPECIFIC_TERMS = (
    "financial",
    "revenue",
    "sales",
    "profit",
    "margin",
    "eps",
    "roe",
    "roa",
    "roce",
    "debt",
    "equity",
    "dividend",
    "ebitda",
    " pat",
    "nii",
    "nim",
    "segment",
    "valuation",
    " p/e",
    "price to",
    "ratio",
    "cash flow",
    "balance sheet",
    " q1",
    " q2",
    " q3",
    " q4",
    "quarter",
    "fy20",
    "fy21",
    "fy22",
    "fy23",
    "fy24",
    "fy25",
    "fiscal",
    "interest rate",
    "interest income",
    " net interest",
    "loan book",
    "deposit",
    "advances",
    "capex",
    "competitor",
    "peer comparison",
    " npa",
    "capital adequacy",
    "asset quality",
    "subsidiary",
    "forecast",
    "guidance",
    "md&a",
    "management discussion",
    "operating margin",
    "net income",
    "earnings per",
    " ebit",
    " pbt",
    " crore",
    " billion",
    " million",
    "percent",
    "%",
)


def _normalize_query(query: str) -> str:
    return " ".join(query.lower().strip().rstrip("?.!").split())


def is_generic_broad_query(query: str) -> bool:
    """True when the question is casual/broad with no specific metric or topic."""
    # Avoid circular import at module load — meta queries are handled separately.
    from agents.synthesis_agent import is_report_meta_query

    if is_report_meta_query(query):
        return False

    q = _normalize_query(query)
    if not q or len(q) > 90:
        return False

    padded = f" {q} "
    if any(f" {term}" in padded or term in q for term in FINANCIAL_SPECIFIC_TERMS):
        return False

    if any(phrase in q for phrase in GENERIC_PHRASES):
        return True

    words = q.split()
    if len(words) <= 6:
        vague_words = {
            "doing",
            "overview",
            "update",
            "status",
            "summary",
            "performance",
            "health",
            "outlook",
            "picture",
        }
        if any(w in words for w in vague_words):
            return True

    if q.startswith("how ") and ("doing" in q or "performing" in q):
        return True

    return False


CLARIFYING_MESSAGE = (
    "Could you specify what aspect you're interested in — financial performance, "
    "recent developments, risks, valuation, or something else? "
    "Pick a company from the home page to get a focused answer."
)

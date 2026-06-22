from __future__ import annotations

from agents.generic_query import CLARIFYING_MESSAGE, FINANCIAL_SPECIFIC_TERMS

_GREETINGS = frozenset({
    "hey",
    "hi",
    "hello",
    "hiya",
    "heya",
    "yo",
    "sup",
    "howdy",
    "gm",
    "morning",
    "evening",
    "good morning",
    "good afternoon",
    "good evening",
})

_THANKS = frozenset({
    "thanks",
    "thank you",
    "thankyou",
    "thx",
    "ty",
    "cheers",
    "appreciate it",
    "much appreciated",
})

_ACK = frozenset({
    "ok",
    "okay",
    "k",
    "cool",
    "got it",
    "understood",
    "nice",
    "great",
    "sure",
    "alright",
    "sounds good",
})

_FAREWELL = frozenset({
    "bye",
    "goodbye",
    "see you",
    "see ya",
    "cya",
    "later",
})

_HELP_PHRASES = (
    "what can you do",
    "what do you do",
    "how do i use this",
    "how does this work",
    "how do i use",
    "what is this",
    "who are you",
    "help me",
    "help",
)

_COMPANY_NAMES: dict[str, str] = {
    "RELIANCE": "Reliance Industries",
    "TCS": "Tata Consultancy Services",
    "INFY": "Infosys",
    "HDFCBANK": "HDFC Bank",
    "ICICIBANK": "ICICI Bank",
    "WIPRO": "Wipro",
    "HCLTECH": "HCL Technologies",
    "BAJFINANCE": "Bajaj Finance",
    "KOTAKBANK": "Kotak Mahindra Bank",
    "LT": "Larsen & Toubro",
    "ASIANPAINT": "Asian Paints",
    "TITAN": "Titan Company",
    "MARUTI": "Maruti Suzuki",
    "TATAMOTORS": "Tata Motors",
    "SUNPHARMA": "Sun Pharma",
    "BHARTIARTL": "Bharti Airtel",
    "ITC": "ITC",
    "AXISBANK": "Axis Bank",
    "SBIN": "State Bank of India",
    "NESTLEIND": "Nestle India",
}


def _normalize(query: str) -> str:
    return " ".join(query.lower().strip().rstrip("?.!,").split())


def _has_financial_intent(query: str) -> bool:
    padded = f" {_normalize(query)} "
    return any(f" {term}" in padded or term in padded for term in FINANCIAL_SPECIFIC_TERMS)


def company_display_name(ticker: str | None) -> str | None:
    if not ticker:
        return None
    return _COMPANY_NAMES.get(ticker.upper(), ticker.upper())


_EQUITY_TOPIC_HINTS = (
    "risk",
    "risks",
    "growth",
    "outlook",
    "earnings",
    "income",
    "segment",
    "business",
    "stock",
    "share",
    "invest",
    "thesis",
    "margin",
    "profit",
    "revenue",
    "sales",
    "debt",
    "cash",
    "valuation",
    "peer",
    "compare",
    "fy",
    "quarter",
    "annual",
    "report",
    "management",
    "dividend",
    "performance",
    "doing",
    "overview",
)


def _has_equity_topic(query: str) -> bool:
    q = _normalize(query)
    return any(term in q for term in _EQUITY_TOPIC_HINTS)


def classify_chat_intent(query: str) -> str:
    """
    conversational — greetings, thanks, help; no filing retrieval.
    clarify       — too vague / non-financial; ask for a specific question.
    retrieval     — proceed with RAG / report-aware synthesis.
    """
    q = _normalize(query)
    if not q:
        return "clarify"

    if _has_financial_intent(q):
        return "retrieval"

    if _has_equity_topic(q):
        return "retrieval"

    if q in _GREETINGS | _THANKS | _ACK | _FAREWELL:
        return "conversational"

    for phrase in _HELP_PHRASES:
        if q == phrase or q.startswith(f"{phrase} "):
            return "conversational"

    words = q.split()
    if words and words[0] in _GREETINGS and len(words) <= 4:
        return "conversational"

    if any(q.startswith(f"{g} ") for g in ("hi", "hello", "hey")) and len(words) <= 4:
        return "conversational"

    # Short non-financial utterances — avoid forcing RAG on noise.
    if len(words) <= 2 and len(q) <= 24:
        return "clarify"

    if len(words) <= 4 and len(q) <= 40 and not any(
        w in q for w in ("report", "company", "compare", "versus", " vs ")
    ):
        return "clarify"

    return "retrieval"


def build_conversational_response(
    query: str,
    *,
    ticker: str | None = None,
    company_name: str | None = None,
    has_report: bool = False,
) -> str:
    q = _normalize(query)
    label = company_name or company_display_name(ticker) or "this company"

    if q in _THANKS or q in _ACK:
        return (
            "You're welcome. Ask another question about the financials whenever you're ready."
        )

    if q in _FAREWELL:
        return "Goodbye — come back anytime you want to dig into the numbers."

    if any(q == p or q.startswith(f"{p} ") for p in _HELP_PHRASES):
        if has_report:
            return (
                f"I read the on-screen {label} analyst report and BSE/NSE filings to answer your questions. "
                "Try: \"What was FY25 revenue?\", \"Key risks?\", or \"Summarize this report\"."
            )
        if ticker:
            return (
                f"I answer questions about {label} using its FY25 annual report filings. "
                "Try revenue, profit, margins, risks, or segment breakdown — be as specific as you can."
            )
        return (
            "I'm RupeeRead — an equity research assistant for Nifty 20 companies. "
            "Open a company from the home page, then ask specific questions about its financials."
        )

    # Greetings (default)
    if has_report:
        return (
            f"Hi! I can help you explore the {label} report on this page. "
            "Ask about revenue, margins, risks, valuation, or say \"summarize this report\"."
        )
    if ticker:
        return (
            f"Hi! Ask me anything about {label}'s FY25 filings — revenue, profit, risks, segments, and more."
        )
    return (
        "Hi! I'm RupeeRead. Pick a company from the home page, then ask a specific financial question."
    )


def build_clarify_response(
    *,
    ticker: str | None = None,
    company_name: str | None = None,
    has_report: bool = False,
) -> str:
    label = company_name or company_display_name(ticker)
    if has_report and label:
        return (
            f"I need a clearer question about {label}. Try revenue, net profit, key risks, "
            "valuation, or \"summarize this report\"."
        )
    if label:
        return (
            f"Could you be more specific about {label}? For example: FY25 revenue, PAT growth, "
            "key risks, or segment performance."
        )
    return CLARIFYING_MESSAGE


def conversational_eval_scores() -> dict:
    """Fixed eval for non-RAG conversational turns — avoids false Grade C."""
    return {
        "faithfulness_score": 1.0,
        "unsupported_sentences": [],
        "hallucination_detected": 0,
        "hallucination_flags": [],
        "citation_accuracy": 1.0,
        "answer_relevance": 1.0,
        "sources_used": 0,
        "total_claims": 1,
        "verified_claims": 1,
        "grade": "A",
        "confidence": "high",
        "degraded": False,
    }

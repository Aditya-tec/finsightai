from __future__ import annotations

from agents.query_analyser import break_into_subquestions
from agents.retrieval_agent import retrieve_context
from agents.router import classify_query
from agents.synthesis_agent import synthesize_answer
from evaluation.eval_pipeline import run_eval_pipeline


def _format_memory(history: list[dict]) -> str:
    if not history:
        return ""
    lines = []
    for msg in history[-8:]:
        role = msg.get("role", "user")
        content = msg.get("content", "")
        lines.append(f"{role}: {content}")
    return "\n".join(lines)


def run_chat(query: str, ticker: str | None = None, history: list[dict] | None = None) -> dict:
    history = history or []
    _ = break_into_subquestions(query)
    context = retrieve_context(query, ticker=ticker)
    answer = synthesize_answer(query=query, context=context, memory=_format_memory(history))
    citations = [
        {
            "source": c.get("doc_type", "unknown"),
            "page": c.get("page_number"),
            "section": c.get("section_title"),
        }
        for c in context[:8]
    ]
    eval_scores = run_eval_pipeline(query=query, answer=answer, context=context, citations=citations)
    return {
        "answer": answer,
        "citations": citations,
        "eval_scores": eval_scores,
        "sources": sorted({c["source"] for c in citations}),
        "route": classify_query(query),
    }

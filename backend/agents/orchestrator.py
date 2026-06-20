from __future__ import annotations

from agents.generic_query import (
    CLARIFYING_MESSAGE,
    EXECUTIVE_SUMMARY_RETRIEVAL_QUERY,
    is_generic_broad_query,
)
from agents.query_analyser import break_into_subquestions
from agents.retrieval_agent import retrieve_context
from agents.router import classify_query
from agents.synthesis_agent import is_report_meta_query, synthesize_answer
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


def _split_report_and_chat(history: list[dict]) -> tuple[str, list[dict]]:
    if not history or history[0].get("role") != "assistant":
        return "", history

    report_blocks: list[str] = []
    chat_history: list[dict] = []
    for msg in history:
        if not chat_history and msg.get("role") == "assistant":
            report_blocks.append(str(msg.get("content", "")))
        else:
            chat_history.append(msg)
    return "\n\n".join(report_blocks), chat_history


def _citations_from_report_history(history: list[dict]) -> list[dict]:
    citations: list[dict] = []
    seen: set[tuple] = set()
    for msg in history:
        if msg.get("role") == "user":
            break
        for raw in msg.get("citations") or []:
            item = {
                "source": raw.get("source", "report"),
                "page": raw.get("page"),
                "section": raw.get("section"),
            }
            key = (item["source"], item["page"], item["section"])
            if key in seen:
                continue
            seen.add(key)
            citations.append(item)
    return citations[:8]


def run_chat(query: str, ticker: str | None = None, history: list[dict] | None = None) -> dict:
    history = history or []
    _ = break_into_subquestions(query)

    report_context, chat_history = _split_report_and_chat(history)
    memory = _format_memory(chat_history)
    has_report = bool(report_context.strip())
    meta_query = has_report and is_report_meta_query(query)
    generic_query = is_generic_broad_query(query)

    if meta_query:
        context: list[dict] = []
    elif generic_query and has_report:
        context = []
    elif generic_query and ticker:
        context = retrieve_context(
            EXECUTIVE_SUMMARY_RETRIEVAL_QUERY,
            ticker=ticker,
            fast=True,
        )
    elif generic_query:
        context = []
    else:
        context = retrieve_context(query, ticker=ticker)

    answer = synthesize_answer(
        query=query,
        context=context,
        memory=memory,
        report_context=report_context,
        generic_query=generic_query,
    )

    if meta_query and has_report:
        citations = _citations_from_report_history(history)
    else:
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
        "sources": sorted({c["source"] for c in citations if c.get("source")}),
        "route": classify_query(query),
        "generic_query": generic_query,
    }

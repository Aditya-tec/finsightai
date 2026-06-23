from __future__ import annotations

from agents.citation_utils import citation_from_chunk
from agents.citation_validate import enrich_and_validate_citation, validate_citations
from agents.conversational_query import (
    build_clarify_response,
    build_conversational_response,
    classify_chat_intent,
    company_display_name,
    conversational_eval_scores,
)
from agents.events import EventCallback, emit
from agents.generic_query import (
    CLARIFYING_MESSAGE,
    EXECUTIVE_SUMMARY_RETRIEVAL_QUERY,
    is_generic_broad_query,
)
from agents.query_analyser import break_into_subquestions
from agents.report_agent import _load_disk_cache
from agents.retrieval_agent import retrieve_context
from agents.router import classify_query
from agents.synthesis_agent import (
    is_report_meta_query,
    synthesize_answer,
    synthesize_compare_answer,
)
from agents.ticker_parser import is_comparative_query, is_peer_compare_query, parse_tickers_from_query, peers_for_ticker
from evaluation.eval_pipeline import run_eval_pipeline
from rag.multi_hop import is_complex_query
from rag.search_errors import SearchIndexError


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
            item = dict(raw)
            key = (item.get("source"), item.get("page"), item.get("section"))
            if key in seen:
                continue
            seen.add(key)
            citations.append(item)
    return citations[:8]


def _cache_context_from_report(ticker: str) -> list[dict]:
    loaded = _load_disk_cache(ticker)
    if loaded is None:
        return []
    sections, eval_context, _ = loaded
    exec_body = ""
    for section in sections:
        if "executive summary" in section.title.lower():
            exec_body = section.body
            break
    if exec_body:
        return [{"content": exec_body, "ticker": ticker, "doc_type": "report_cache", "fiscal_year": "FY25"}]
    if eval_context:
        return eval_context[:5]
    return []


def _retrieve_with_fallback(
    query: str,
    ticker: str | None,
    *,
    report_context: str,
    subquestions: list[str] | None,
    on_event: EventCallback | None,
) -> tuple[list[dict], bool]:
    try:
        return retrieve_context(
            query,
            ticker=ticker,
            subquestions=subquestions,
            on_event=on_event,
        ), False
    except SearchIndexError:
        emit(on_event, "step", {"message": "Search index unavailable — using fallback context", "phase": "fallback"})
        if report_context.strip():
            return [], True
        if ticker:
            cached = _cache_context_from_report(ticker)
            if cached:
                return cached, True
        raise


def run_chat(
    query: str,
    ticker: str | None = None,
    history: list[dict] | None = None,
    *,
    tickers: list[str] | None = None,
    on_event: EventCallback | None = None,
) -> dict:
    history = history or []
    subquestions = break_into_subquestions(query) if is_complex_query(query) else None

    report_context, chat_history = _split_report_and_chat(history)
    memory = _format_memory(chat_history)
    has_report = bool(report_context.strip())
    meta_query = has_report and is_report_meta_query(query)
    generic_query = is_generic_broad_query(query)
    degraded = False

    parsed_tickers = parse_tickers_from_query(query, tickers)
    if not parsed_tickers and ticker:
        parsed_tickers = [ticker.upper()]

    if is_peer_compare_query(query) and len(parsed_tickers) == 1:
        parsed_tickers = parsed_tickers + peers_for_ticker(parsed_tickers[0])

    emit(on_event, "step", {"message": "Analysing your query…", "phase": "routing"})

    if is_comparative_query(query) and len(parsed_tickers) < 2:
        answer = (
            "Please name at least two companies to compare (e.g. 'Compare INFY vs TCS revenue'). "
            "You can use ticker symbols or company names from the Nifty 20 universe."
        )
        eval_scores = run_eval_pipeline(query=query, answer=answer, context=[], citations=[])
        result = {
            "answer": answer,
            "citations": [],
            "eval_scores": eval_scores,
            "sources": [],
            "route": classify_query(query),
            "generic_query": generic_query,
        }
        emit(on_event, "result", result)
        return result

    if len(parsed_tickers) > 1:
        emit(on_event, "step", {"message": f"Comparing {', '.join(parsed_tickers)}…", "phase": "multi_ticker"})
        contexts_by_ticker: dict[str, list[dict]] = {}
        all_context: list[dict] = []
        for t in parsed_tickers:
            try:
                ctx, deg = _retrieve_with_fallback(
                    query,
                    t,
                    report_context=report_context,
                    subquestions=subquestions,
                    on_event=on_event,
                )
                contexts_by_ticker[t] = ctx
                all_context.extend(ctx)
                degraded = degraded or deg
            except SearchIndexError:
                contexts_by_ticker[t] = []
        emit(on_event, "step", {"message": "Generating comparison…", "phase": "synthesis"})
        answer = synthesize_compare_answer(query, contexts_by_ticker, memory)
        citations = [citation_from_chunk(c) for c in all_context[:8]]
        eval_scores = run_eval_pipeline(
            query=query, answer=answer, context=all_context, citations=citations, degraded=degraded
        )
        emit(on_event, "eval", {"eval_scores": eval_scores})
        result = {
            "answer": answer,
            "citations": citations,
            "eval_scores": eval_scores,
            "sources": sorted({c["source"] for c in citations if c.get("source")}),
            "route": classify_query(query),
            "generic_query": generic_query,
            "tickers": parsed_tickers,
        }
        emit(on_event, "result", result)
        return result

    active_ticker = parsed_tickers[0] if parsed_tickers else ticker

    chat_intent = classify_chat_intent(query)
    if chat_intent in ("conversational", "clarify") and not meta_query:
        emit(
            on_event,
            "step",
            {"message": "Responding without filing lookup…", "phase": "conversational"},
        )
        display_name = company_display_name(active_ticker)
        if chat_intent == "conversational":
            answer = build_conversational_response(
                query,
                ticker=active_ticker,
                company_name=display_name,
                has_report=has_report,
            )
        else:
            answer = build_clarify_response(
                ticker=active_ticker,
                company_name=display_name,
                has_report=has_report,
            )
        result = {
            "answer": answer,
            "citations": [],
            "eval_scores": conversational_eval_scores(),
            "sources": [],
            "route": "CONVERSATIONAL" if chat_intent == "conversational" else "CLARIFY",
            "generic_query": False,
            "tickers": [active_ticker] if active_ticker else [],
        }
        emit(on_event, "eval", {"eval_scores": result["eval_scores"]})
        emit(on_event, "result", result)
        return result

    if meta_query:
        context: list[dict] = []
    elif generic_query and has_report:
        context = []
    elif generic_query and active_ticker:
        try:
            context = retrieve_context(
                EXECUTIVE_SUMMARY_RETRIEVAL_QUERY,
                active_ticker,
                fast=True,
                on_event=on_event,
            )
        except SearchIndexError:
            cached = _cache_context_from_report(active_ticker)
            context = cached
            degraded = bool(cached)
    elif generic_query:
        context = []
    else:
        try:
            context, degraded = _retrieve_with_fallback(
                query,
                active_ticker,
                report_context=report_context,
                subquestions=subquestions,
                on_event=on_event,
            )
        except SearchIndexError:
            if has_report:
                context = []
                degraded = True
            else:
                raise

    emit(on_event, "step", {"message": "Generating final synthesis…", "phase": "synthesis"})
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
        raw = [citation_from_chunk(c) for c in context[:8]]
        sym = active_ticker or ""
        citations = validate_citations(raw, sym) if sym else raw

    eval_scores = run_eval_pipeline(
        query=query, answer=answer, context=context, citations=citations, degraded=degraded
    )
    emit(on_event, "eval", {"eval_scores": eval_scores})

    result = {
        "answer": answer,
        "citations": citations,
        "eval_scores": eval_scores,
        "sources": sorted({c["source"] for c in citations if c.get("source")}),
        "route": classify_query(query),
        "generic_query": generic_query,
        "tickers": parsed_tickers if len(parsed_tickers) > 1 else ([active_ticker] if active_ticker else []),
    }
    emit(on_event, "result", result)
    return result

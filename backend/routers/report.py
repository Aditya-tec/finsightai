from __future__ import annotations

import asyncio

from fastapi import APIRouter, HTTPException
from groq import RateLimitError

from agents.report_agent import build_report
from agents.retrieval_agent import retrieve_context
from evaluation.eval_pipeline import run_eval_pipeline
from schemas import ReportRequest, ReportResponse

router = APIRouter()


def _generate_report(ticker: str) -> ReportResponse:
    sections = build_report(ticker)
    context = retrieve_context(f"{ticker} financial overview", ticker=ticker, fast=True)
    citations = []
    for section in sections:
        citations.extend([c.model_dump() for c in section.citations])
    answer_blob = "\n".join(section.body for section in sections)
    eval_scores = run_eval_pipeline(
        query=f"report {ticker}",
        answer=answer_blob,
        context=context,
        citations=citations,
    )
    all_citations = [c for section in sections for c in section.citations]
    return ReportResponse(
        sections=sections,
        citations=all_citations,
        eval_scores=eval_scores,
        sources=sorted({c.source for c in all_citations}),
    )


@router.post("/report", response_model=ReportResponse)
async def report(request: ReportRequest):
    try:
        return await asyncio.to_thread(_generate_report, request.ticker)
    except RateLimitError:
        raise HTTPException(
            status_code=429,
            detail="Groq daily token limit reached. Wait a few minutes or use a fresh API key, then retry.",
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Report generation failed: {exc}") from exc

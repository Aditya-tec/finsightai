from __future__ import annotations

import asyncio
import json
import queue
import threading

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from groq import RateLimitError

from agents.report_agent import build_report, iter_report_sections
from evaluation.eval_pipeline import run_eval_pipeline
from rag.search_errors import SearchIndexError
from schemas import ReportRequest, ReportResponse, ReportSection

router = APIRouter()


def _generate_report(ticker: str, force_refresh: bool = False) -> ReportResponse:
    sections, eval_context, generated_at = build_report(ticker, force_refresh=force_refresh)
    citations = []
    for section in sections:
        citations.extend([c.model_dump() for c in section.citations])
    answer_blob = "\n".join(section.body for section in sections)
    eval_scores = run_eval_pipeline(
        query=f"report {ticker}",
        answer=answer_blob,
        context=eval_context,
        citations=citations,
    )
    all_citations = [c for section in sections for c in section.citations]
    return ReportResponse(
        sections=sections,
        citations=all_citations,
        eval_scores=eval_scores,
        sources=sorted({c.source for c in all_citations}),
        generated_at=generated_at,
    )


def _stream_report_worker(ticker: str, force_refresh: bool, event_queue: queue.Queue) -> None:
    try:
        sections: list[ReportSection] = []
        generated_at = None
        eval_context: list[dict] = []
        for event in iter_report_sections(ticker, force_refresh=force_refresh):
            if event["type"] == "section":
                section = ReportSection.model_validate(event["section"])
                sections.append(section)
                event_queue.put(event)
            elif event["type"] == "complete":
                generated_at = event.get("generated_at")
                event_queue.put(event)
        from agents.report_agent import _load_disk_cache

        disk = _load_disk_cache(ticker)
        if disk:
            _, eval_context, _ = disk
        citations = [c.model_dump() for s in sections for c in s.citations]
        answer_blob = "\n".join(s.body for s in sections)
        eval_scores = run_eval_pipeline(
            query=f"report {ticker}",
            answer=answer_blob,
            context=eval_context,
            citations=citations,
        )
        event_queue.put(
            {
                "type": "result",
                "eval_scores": eval_scores,
                "generated_at": generated_at,
                "sources": sorted({c.get("source") for c in citations if c.get("source")}),
            }
        )
        event_queue.put({"type": "done"})
    except SearchIndexError:
        try:
            resp = _generate_report(ticker, force_refresh=False)
            for i, section in enumerate(resp.sections):
                event_queue.put(
                    {
                        "type": "section",
                        "index": i,
                        "section": section.model_dump(),
                        "total": len(resp.sections),
                        "cached": True,
                        "generated_at": resp.generated_at,
                    }
                )
            event_queue.put({"type": "complete", "generated_at": resp.generated_at, "total": len(resp.sections)})
            event_queue.put(
                {
                    "type": "result",
                    "eval_scores": {**resp.eval_scores, "degraded": True},
                    "generated_at": resp.generated_at,
                }
            )
            event_queue.put({"type": "done"})
        except Exception as exc:
            event_queue.put({"type": "error", "detail": str(exc) or "Search index unavailable"})
    except RateLimitError:
        event_queue.put({"type": "error", "detail": "Groq rate limit reached", "status": 429})
    except Exception as exc:
        event_queue.put({"type": "error", "detail": f"Report generation failed: {exc}"})


@router.post("/report", response_model=ReportResponse)
async def report(request: ReportRequest):
    try:
        return await asyncio.to_thread(_generate_report, request.ticker, request.force_refresh)
    except RateLimitError:
        raise HTTPException(
            status_code=429,
            detail="Groq daily token limit reached. Wait a few minutes or use a fresh API key, then retry.",
        )
    except SearchIndexError:
        try:
            return await asyncio.to_thread(_generate_report, request.ticker, False)
        except Exception:
            raise HTTPException(status_code=503, detail="Search index unavailable")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Report generation failed: {exc}") from exc


@router.post("/report/stream")
async def report_stream(request: ReportRequest):
    event_queue: queue.Queue = queue.Queue()

    def worker() -> None:
        _stream_report_worker(request.ticker, request.force_refresh, event_queue)

    threading.Thread(target=worker, daemon=True).start()

    async def generate():
        while True:
            try:
                item = await asyncio.to_thread(event_queue.get, True, 600)
            except queue.Empty:
                yield f"data: {json.dumps({'type': 'error', 'detail': 'Request timed out'})}\n\n"
                break
            yield f"data: {json.dumps(item, default=str)}\n\n"
            if item.get("type") == "done":
                break
            if item.get("type") == "error" and "report" not in item:
                break

    return StreamingResponse(generate(), media_type="text/event-stream")

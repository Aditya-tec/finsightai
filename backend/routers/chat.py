from __future__ import annotations

import asyncio
import json
import queue
import threading

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from groq import RateLimitError

from agents.orchestrator import run_chat
from rag.search_errors import SearchIndexError
from schemas import ChatRequest, ChatResponse

router = APIRouter()


def _run_chat_with_events(request: ChatRequest, event_queue: queue.Queue) -> None:
    def on_event(event_type: str, payload: dict) -> None:
        event_queue.put({"type": event_type, **payload})

    try:
        result = run_chat(
            request.query,
            request.ticker,
            [m.model_dump() for m in request.conversation_history],
            tickers=request.tickers,
            on_event=on_event,
        )
        event_queue.put({"type": "done", "result": result})
    except SearchIndexError as exc:
        event_queue.put({"type": "error", "detail": str(exc) or "Search index unavailable"})
    except RateLimitError:
        event_queue.put({"type": "error", "detail": "Groq rate limit reached", "status": 429})
    except Exception as exc:
        event_queue.put({"type": "error", "detail": f"Chat failed: {exc}"})


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    try:
        result = await asyncio.to_thread(
            run_chat,
            request.query,
            request.ticker,
            [m.model_dump() for m in request.conversation_history],
            tickers=request.tickers,
        )
        return ChatResponse(**result)
    except RateLimitError:
        raise HTTPException(
            status_code=429,
            detail="Groq daily token limit reached. Wait a few minutes or use a fresh API key, then retry.",
        )
    except SearchIndexError:
        raise HTTPException(status_code=503, detail="Search index unavailable")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Chat failed: {exc}") from exc


@router.post("/chat/stream")
async def chat_stream(request: ChatRequest):
    event_queue: queue.Queue = queue.Queue()

    def worker() -> None:
        _run_chat_with_events(request, event_queue)

    threading.Thread(target=worker, daemon=True).start()

    async def generate():
        while True:
            try:
                item = await asyncio.to_thread(event_queue.get, True, 120)
            except queue.Empty:
                yield f"data: {json.dumps({'type': 'error', 'detail': 'Request timed out'})}\n\n"
                break
            yield f"data: {json.dumps(item, default=str)}\n\n"
            if item.get("type") in ("done", "error"):
                break

    return StreamingResponse(generate(), media_type="text/event-stream")

from __future__ import annotations

import asyncio

from fastapi import APIRouter, HTTPException
from groq import RateLimitError

from agents.orchestrator import run_chat
from rag.search_errors import SearchIndexError
from schemas import ChatRequest, ChatResponse

router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    try:
        result = await asyncio.to_thread(
            run_chat,
            request.query,
            request.ticker,
            [m.model_dump() for m in request.conversation_history],
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

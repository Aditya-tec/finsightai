from __future__ import annotations

import asyncio

from fastapi import APIRouter, HTTPException
from groq import RateLimitError

from agents.bullet_summary_agent import summarize_section_bullets
from schemas import SummarizeBulletsRequest, SummarizeBulletsResponse

router = APIRouter()


@router.post("/summarize-bullets", response_model=SummarizeBulletsResponse)
async def summarize_bullets(request: SummarizeBulletsRequest):
    try:
        bullets = await asyncio.to_thread(
            summarize_section_bullets,
            request.title,
            request.body,
        )
        return SummarizeBulletsResponse(bullets=bullets)
    except RateLimitError:
        raise HTTPException(
            status_code=429,
            detail="Groq daily token limit reached. Wait a few minutes or use a fresh API key, then retry.",
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Bullet summary failed: {exc}") from exc

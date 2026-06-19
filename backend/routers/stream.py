from __future__ import annotations

import asyncio

from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse

router = APIRouter()


@router.get("/stream")
async def stream(query: str = Query(default="")):
    async def generate():
        steps = [
            "Analysing your query...",
            "Breaking query into sub-questions...",
            "Running hybrid retrieval...",
            "Applying self-correction judge...",
            "Running reranker and graph enrichment...",
            "Generating final synthesis...",
            "DONE",
        ]
        for step in steps:
            await asyncio.sleep(0.6)
            yield f"data: {step}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")

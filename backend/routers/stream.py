from __future__ import annotations

from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse

router = APIRouter()


@router.get("/stream")
async def stream(query: str = Query(default="")):
    """Deprecated: use POST /api/chat/stream for real agent events."""
    return JSONResponse(
        status_code=410,
        content={
            "detail": "This endpoint is deprecated. Use POST /api/chat/stream instead.",
            "query": query,
        },
    )

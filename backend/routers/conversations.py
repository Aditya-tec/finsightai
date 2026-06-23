from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel, Field

from services.conversation_store import (
    append_message,
    get_or_create_conversation,
    load_messages,
)

router = APIRouter()


class ConversationCreate(BaseModel):
    session_id: str
    ticker: str | None = None


class MessageCreate(BaseModel):
    role: str
    content: str
    citations: list[dict] = Field(default_factory=list)


@router.post("/conversations")
async def create_conversation(body: ConversationCreate):
    conv_id = get_or_create_conversation(body.session_id, body.ticker)
    if not conv_id:
        return {"id": None, "available": False}
    return {"id": conv_id, "session_id": body.session_id, "available": True}


@router.get("/conversations/{session_id}")
async def get_conversation(session_id: str, limit: int = 20):
    conv_id = get_or_create_conversation(session_id, None)
    if not conv_id:
        return {"messages": [], "available": False}
    return {"messages": load_messages(conv_id, limit=limit), "available": True}


@router.get("/conversations/{session_id}/messages")
async def get_conversation_messages(session_id: str, limit: int = 20):
    return await get_conversation(session_id, limit=limit)


@router.post("/conversations/{conversation_id}/messages")
async def post_message(conversation_id: str, body: MessageCreate):
    append_message(conversation_id, body.role, body.content, body.citations)
    return {"ok": True}

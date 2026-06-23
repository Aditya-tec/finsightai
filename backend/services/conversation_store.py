from __future__ import annotations

import logging
from typing import Any

from settings import settings

logger = logging.getLogger("rupeeread.conversations")

_client = None


def _get_client():
    global _client
    if _client is not None:
        return _client
    if not settings.supabase_url or not settings.supabase_key:
        return None
    try:
        from supabase import create_client

        _client = create_client(settings.supabase_url, settings.supabase_key)
        return _client
    except Exception as exc:
        logger.warning("Supabase unavailable for conversations: %s", exc)
        return None


def get_or_create_conversation(session_id: str, ticker: str | None) -> str | None:
    client = _get_client()
    if not client:
        return None
    try:
        existing = (
            client.table("conversations")
            .select("id")
            .eq("session_id", session_id)
            .limit(1)
            .execute()
        )
        if existing.data:
            return existing.data[0]["id"]
        inserted = (
            client.table("conversations")
            .insert({"session_id": session_id, "ticker": ticker})
            .execute()
        )
        return inserted.data[0]["id"] if inserted.data else None
    except Exception as exc:
        logger.warning("conversation create failed: %s", exc)
        return None


def load_messages(conversation_id: str, limit: int = 20) -> list[dict[str, Any]]:
    client = _get_client()
    if not client:
        return []
    try:
        rows = (
            client.table("messages")
            .select("role, content, citations")
            .eq("conversation_id", conversation_id)
            .order("created_at")
            .limit(limit)
            .execute()
        )
        return rows.data or []
    except Exception as exc:
        logger.warning("load messages failed: %s", exc)
        return []


def append_message(
    conversation_id: str,
    role: str,
    content: str,
    citations: list[dict] | None = None,
) -> None:
    client = _get_client()
    if not client:
        return
    try:
        client.table("messages").insert(
            {
                "conversation_id": conversation_id,
                "role": role,
                "content": content,
                "citations": citations or [],
            }
        ).execute()
    except Exception as exc:
        logger.warning("append message failed: %s", exc)

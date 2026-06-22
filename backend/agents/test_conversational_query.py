"""Tests for conversational chat routing (run: python -m agents.test_conversational_query)."""
from __future__ import annotations

from agents.conversational_query import (
    build_conversational_response,
    classify_chat_intent,
    company_display_name,
)


def test_greetings_are_conversational() -> None:
    assert classify_chat_intent("hey") == "conversational"
    assert classify_chat_intent("Hi!") == "conversational"
    assert classify_chat_intent("hello there") == "conversational"
    assert classify_chat_intent("good morning") == "conversational"


def test_financial_queries_use_retrieval() -> None:
    assert classify_chat_intent("What was FY25 revenue?") == "retrieval"
    assert classify_chat_intent("key risks") == "retrieval"
    assert classify_chat_intent("consolidated PAT") == "retrieval"
    assert classify_chat_intent("how is company doing") == "retrieval"


def test_vague_short_queries_clarify() -> None:
    assert classify_chat_intent("lol") == "clarify"
    assert classify_chat_intent("test") == "clarify"
    assert classify_chat_intent("hmm") == "clarify"


def test_help_is_conversational() -> None:
    assert classify_chat_intent("help") == "conversational"
    assert classify_chat_intent("what can you do") == "conversational"


def test_greeting_response_mentions_company() -> None:
    text = build_conversational_response(
        "hey",
        ticker="TITAN",
        company_name=company_display_name("TITAN"),
        has_report=True,
    )
    assert "Titan" in text
    assert "revenue" in text.lower()


if __name__ == "__main__":
    test_greetings_are_conversational()
    test_financial_queries_use_retrieval()
    test_vague_short_queries_clarify()
    test_help_is_conversational()
    test_greeting_response_mentions_company()
    print("All conversational_query checks passed.")

from __future__ import annotations

from agents.conversational_query import classify_chat_intent, conversational_eval_scores
from evaluation.eval_pipeline import run_eval_pipeline


def test_conversational_intent_skips_retrieval() -> None:
    assert classify_chat_intent("hey") == "conversational"
    assert classify_chat_intent("thanks") == "conversational"


def test_conversational_eval_scores_not_grade_a() -> None:
    scores = conversational_eval_scores()
    assert scores["eval_method"] == "conversational"
    assert scores["grade"] == "—"


def test_lexical_eval_caps_grade_at_b() -> None:
    scores = run_eval_pipeline(
        query="revenue",
        answer="Revenue was strong in FY25 based on filings.",
        context=[{"content": "Revenue was strong in FY25 based on filings."}],
        citations=[],
    )
    assert scores["eval_method"] == "lexical_heuristic"
    assert scores["grade"] in ("B", "C", "—")

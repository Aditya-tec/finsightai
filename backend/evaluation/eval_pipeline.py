from __future__ import annotations

from evaluation.citation_checker import citation_accuracy
from evaluation.faithfulness import score_faithfulness
from evaluation.hallucination import detect_hallucinations
from evaluation.relevance_scorer import score_relevance


def run_eval_pipeline(query: str, answer: str, context: list[dict], citations: list[dict]) -> dict:
    faith = score_faithfulness(answer, context)
    hall = detect_hallucinations(answer, context)
    cite_acc = citation_accuracy(citations)
    rel = score_relevance(query, answer)
    grade = "A" if faith >= 0.9 and hall["hallucination_detected"] == 0 else "B"
    return {
        "faithfulness_score": faith,
        "hallucination_detected": hall["hallucination_detected"],
        "hallucination_flags": hall["hallucination_flags"],
        "citation_accuracy": cite_acc,
        "answer_relevance": rel,
        "sources_used": len({c.get("source") for c in citations if c.get("source")}),
        "total_claims": max(len(answer.split(".")), 1),
        "verified_claims": int(max(len(answer.split(".")), 1) * faith),
        "grade": grade,
    }

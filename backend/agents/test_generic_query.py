"""Tests for generic/broad chat query detection (run: python -m agents.test_generic_query)."""
from __future__ import annotations

from agents.generic_query import is_generic_broad_query


def test_generic_phrases_detected() -> None:
    assert is_generic_broad_query("how is company doing")
    assert is_generic_broad_query("how's ICICI doing?")
    assert is_generic_broad_query("tell me about Infosys")
    assert is_generic_broad_query("what's the company like")
    assert is_generic_broad_query("how is the company performing")


def test_specific_queries_not_generic() -> None:
    assert not is_generic_broad_query("What was FY25 revenue and operating margin?")
    assert not is_generic_broad_query("What are the key risks for ICICI Bank?")
    assert not is_generic_broad_query("What is the consolidated PAT?")
    assert not is_generic_broad_query("Compare NII growth vs last year")
    assert not is_generic_broad_query("what is financial performance")


def test_report_meta_not_generic() -> None:
    assert not is_generic_broad_query("what is this report about")


if __name__ == "__main__":
    test_generic_phrases_detected()
    test_specific_queries_not_generic()
    test_report_meta_not_generic()
    print("All generic_query checks passed.")

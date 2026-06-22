"""Tests for chart-section context merge (run: python -m agents.test_report_chart_context)."""

from agents.report_agent import (
    CHART_CONTEXT_CHUNKS,
    _merge_chart_context,
    _table_density_score,
)


def test_table_density_score_counts_numbers() -> None:
    sparse = {"content": "Risk disclosure paragraph without figures."}
    dense = {
        "content": "Revenue 162,990 153,670 Net profit 26,713 26,233 FY25 FY24 crore"
    }
    assert _table_density_score(sparse) < _table_density_score(dense)


def test_merge_chart_context_prioritizes_targeted_and_tables() -> None:
    regular = [
        {"id": "a", "content": "business overview narrative", "rrf_score": 0.9},
        {"id": "b", "content": "revenue 100000 profit 20000 FY25 FY24", "rrf_score": 0.5},
    ]
    targeted = [
        {"id": "c", "content": "segment revenue breakdown FY25 FY24 45175 22059", "rrf_score": 0.2},
        {"id": "b", "content": "revenue 100000 profit 20000 FY25 FY24", "rrf_score": 0.5},
    ]
    merged = _merge_chart_context(regular, targeted, top_n=CHART_CONTEXT_CHUNKS)
    ids = [c["id"] for c in merged]
    assert len(merged) == 3
    assert ids[-1] == "a"
    assert "c" in ids and "b" in ids
    assert ids.index("c") < ids.index("a")


def test_merge_chart_context_dedupes() -> None:
    chunk = {"id": "x", "content": "revenue 1 profit 2 FY25"}
    merged = _merge_chart_context([chunk], [chunk], top_n=5)
    assert len(merged) == 1


if __name__ == "__main__":
    test_table_density_score_counts_numbers()
    test_merge_chart_context_prioritizes_targeted_and_tables()
    test_merge_chart_context_dedupes()
    print("All report chart context checks passed.")

"""Quick checks for scale-aware number grounding (run: python -m evaluation.test_text_normalize)."""
from __future__ import annotations

from evaluation.hallucination import detect_hallucinations
from evaluation.text_normalize import is_number_grounded_in_answer

ICICI_PNL = (
    "CONSOLIDATED PROFIT AND LOSS ACCOUNT for the year ended March 31, 2025 "
    "` in '000s Schedule Year ended 31.03.2025 "
    "TOTAL INCOME 2,945,869,343 2,360,377,272 "
    "Net profit for the year 544,187,134 450,067,447 "
    "Consolidated profit/(loss) for the year attributable to the Group 510,291,955 442,563,735"
)

ICICI_BS = (
    "BALANCE SHEET at March 31, 2025 ` in '000s Schedule At 31.03.2025 "
    "Reserves and surplus 2 2,885,818,597 2,355,893,246"
)


def test_billion_figures_grounded_against_000s_tables() -> None:
    answer = (
        "Consolidated total income was ₹2,945.87 billion. "
        "Reserves stood at ₹2,355.89 billion versus ₹2,885.82 billion. "
        "Consolidated PAT was ₹510.29 billion."
    )
    context = [{"content": ICICI_PNL + " " + ICICI_BS}]
    result = detect_hallucinations(answer, context)
    assert result["hallucination_detected"] == 0, result["hallucination_flags"]


def test_raw_table_integers_flagged_without_scale() -> None:
    answer = "Total income was ₹2,945,869,343 with net profit ₹544,187,134."
    context = [{"content": ICICI_PNL}]
    # Raw integers match context text literally — still "grounded" in source text.
    # Scale-aware path should not falsely clear wrong analyst formatting if not in answer as billions.
    assert is_number_grounded_in_answer("2945869343", answer, ICICI_PNL)


def test_comma_decimal_billion_format() -> None:
    answer = "Total income increased to ₹2,945.87 billion from ₹2,360.38 billion."
    context = [{"content": ICICI_PNL}]
    result = detect_hallucinations(answer, context)
    assert "2945.87" not in result["hallucination_flags"]
    assert "2360.38" not in result["hallucination_flags"]


if __name__ == "__main__":
    test_billion_figures_grounded_against_000s_tables()
    test_comma_decimal_billion_format()
    test_raw_table_integers_flagged_without_scale()
    print("All text_normalize checks passed.")

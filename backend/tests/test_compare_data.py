from __future__ import annotations

import json

from agents.compare_data import format_compare_answer, parse_compare_payload


def test_parse_compare_payload_normalizes_tickers() -> None:
    raw = json.dumps(
        {
            "summary": "ITC and Maruti show different growth profiles.",
            "metrics": [
                {
                    "label": "Revenue (FY25)",
                    "values": {
                        "itc": "₹12,000 Cr [Consolidated]",
                        "MARUTI": "₹1,50,000 Cr [Standalone]",
                    },
                    "note": "",
                }
            ],
            "takeaways": ["ITC is more diversified", "Maruti is auto-focused"],
        }
    )
    payload = parse_compare_payload(raw, ["ITC", "MARUTI"])
    assert payload is not None
    assert payload.metrics[0].values["ITC"].startswith("₹")
    assert payload.metrics[0].values["MARUTI"].startswith("₹")
    answer = format_compare_answer(payload)
    assert "ITC and Maruti" in answer
    assert "Key takeaways" in answer


def test_parse_compare_payload_rejects_empty_metrics() -> None:
    raw = json.dumps({"summary": "No numbers found.", "metrics": [], "takeaways": []})
    assert parse_compare_payload(raw, ["TCS", "WIPRO"]) is None

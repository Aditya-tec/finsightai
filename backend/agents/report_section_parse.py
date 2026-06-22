from __future__ import annotations

import json
from typing import Any

from agents.chart_data import validate_chart_data


def parse_section_json(raw: str, title: str) -> tuple[str, dict[str, Any] | None]:
    text = raw.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        if lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        text = "\n".join(lines).strip()
    try:
        payload = json.loads(text)
        if isinstance(payload, dict) and isinstance(payload.get("body"), str):
            body = payload["body"].strip() or "Content unavailable."
            chart = validate_chart_data(title, payload.get("chart_data"))
            return body, chart
    except json.JSONDecodeError:
        pass
    return text or "Content unavailable.", None

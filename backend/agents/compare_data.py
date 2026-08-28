from __future__ import annotations

import json
import re
from typing import Any

from pydantic import BaseModel, Field, ValidationError, field_validator


class CompareMetric(BaseModel):
    label: str
    values: dict[str, str] = Field(default_factory=dict)
    note: str = ""

    @field_validator("label")
    @classmethod
    def non_empty_label(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("metric label required")
        return cleaned


class ComparePayload(BaseModel):
    summary: str
    metrics: list[CompareMetric] = Field(default_factory=list)
    takeaways: list[str] = Field(default_factory=list)

    @field_validator("summary")
    @classmethod
    def non_empty_summary(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("summary required")
        return cleaned


def _extract_json_object(text: str) -> dict[str, Any] | None:
    raw = text.strip()
    if not raw:
        return None
    fence = re.search(r"```(?:json)?\s*(\{.*\})\s*```", raw, re.DOTALL | re.IGNORECASE)
    if fence:
        raw = fence.group(1)
    try:
        data = json.loads(raw)
        return data if isinstance(data, dict) else None
    except json.JSONDecodeError:
        pass
    start = raw.find("{")
    end = raw.rfind("}")
    if start >= 0 and end > start:
        try:
            data = json.loads(raw[start : end + 1])
            return data if isinstance(data, dict) else None
        except json.JSONDecodeError:
            return None
    return None


def parse_compare_payload(text: str, tickers: list[str]) -> ComparePayload | None:
    data = _extract_json_object(text)
    if not data:
        return None
    try:
        payload = ComparePayload.model_validate(data)
    except ValidationError:
        return None

    allowed = {t.upper() for t in tickers}
    cleaned_metrics: list[CompareMetric] = []
    for metric in payload.metrics:
        values = {
            k.upper(): str(v).strip()
            for k, v in metric.values.items()
            if k and str(v).strip() and k.upper() in allowed
        }
        if not values:
            continue
        cleaned_metrics.append(metric.model_copy(update={"values": values}))
    if not cleaned_metrics:
        return None

    takeaways = [t.strip() for t in payload.takeaways if t and t.strip()]
    return payload.model_copy(update={"metrics": cleaned_metrics[:10], "takeaways": takeaways[:5]})


def format_compare_answer(payload: ComparePayload) -> str:
    parts = [payload.summary.strip()]
    if payload.takeaways:
        parts.append("")
        parts.append("Key takeaways:")
        for item in payload.takeaways:
            parts.append(f"• {item}")
    return "\n".join(parts).strip()

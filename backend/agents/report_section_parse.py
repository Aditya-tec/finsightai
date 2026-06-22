from __future__ import annotations

import json
import re
from typing import Any

from agents.chart_data import validate_chart_data

_LENIENT_SPLIT = re.compile(r'"\s*,\s*"chart_data"\s*:\s*', re.DOTALL)
_BODY_PREFIX = re.compile(r'^\{\s*"body"\s*:\s*', re.DOTALL)
_ARITH_IN_NUMBER = re.compile(r"(?<=[\[,:])\s*(\d+(?:\.\d+)?)\s*/\s*(\d+(?:\.\d+)?)\s*(?=[,\]}])")


def _fix_trailing_chart_braces(text: str) -> str:
    """Close datasets arrays when Groq emits `...]}}` instead of `...]}]}`."""
    trimmed = text.rstrip()
    if trimmed.endswith("]}}"):
        return trimmed[:-4] + "]}]}"
    return trimmed


def _sanitize_chart_json_text(obj_text: str) -> str:
    """Fix common Groq typos in chart_data JSON literals."""

    def _eval_div(match: re.Match[str]) -> str:
        numerator = float(match.group(1))
        denominator = float(match.group(2))
        if denominator == 0:
            return match.group(0)
        value = numerator / denominator
        if value.is_integer():
            return str(int(value))
        return str(round(value, 4))

    text = _ARITH_IN_NUMBER.sub(_eval_div, obj_text)
    text = re.sub(r"(\])\s*(\{)", r"\1,\2", text)
    return text


def _normalize_bar_payload(raw: dict[str, Any]) -> dict[str, Any]:
    """Map 3-year FY23–FY25 bar payloads to the required FY24/FY25 pair."""
    if raw.get("type") != "bar":
        return raw
    labels = raw.get("labels")
    if labels == ["FY23", "FY24", "FY25"]:
        normalized = dict(raw)
        normalized["labels"] = ["FY24", "FY25"]
        datasets: list[dict[str, Any]] = []
        for dataset in raw.get("datasets", []):
            values = dataset.get("values")
            if isinstance(values, list) and len(values) >= 3:
                datasets.append({**dataset, "values": values[-2:]})
            else:
                datasets.append(dataset)
        normalized["datasets"] = datasets
        return normalized
    return raw


def _chart_text_candidates(chart_text: str) -> list[str]:
    bases = [chart_text.rstrip()]
    sanitized = _sanitize_chart_json_text(chart_text.rstrip())
    if sanitized not in bases:
        bases.append(sanitized)
    variants: list[str] = []
    for base in bases:
        candidates = (base, _fix_trailing_chart_braces(base))
        for candidate in candidates:
            if candidate not in variants:
                variants.append(candidate)
    return variants


def _repair_chart_object_text(obj_text: str) -> list[str]:
    """Try common Groq JSON typos (e.g. datasets array closed with }} not }]})."""
    variants = [obj_text]
    sanitized = _sanitize_chart_json_text(obj_text)
    if sanitized != obj_text:
        variants.append(sanitized)
    fixed = _fix_trailing_chart_braces(obj_text)
    if fixed != obj_text.rstrip():
        variants.append(fixed)
    fixed_sanitized = _fix_trailing_chart_braces(sanitized)
    if fixed_sanitized not in variants:
        variants.append(fixed_sanitized)
    return variants


def _parse_chart_from_suffix(chart_text: str, title: str) -> dict[str, Any] | None:
    for text_variant in _chart_text_candidates(chart_text):
        chart_obj = _extract_balanced_object(text_variant, 0)
        if not chart_obj:
            continue
        for candidate in _repair_chart_object_text(chart_obj):
            try:
                chart_raw = json.loads(candidate)
            except json.JSONDecodeError:
                continue
            chart_raw = _normalize_bar_payload(chart_raw)
            chart = validate_chart_data(title, chart_raw)
            if chart is not None:
                return chart
    return None


def _extract_balanced_object(text: str, start: int = 0) -> str | None:
    if start >= len(text) or text[start] != "{":
        return None
    brace_depth = 0
    bracket_depth = 0
    in_string = False
    escape = False
    for i in range(start, len(text)):
        ch = text[i]
        if in_string:
            if escape:
                escape = False
            elif ch == "\\":
                escape = True
            elif ch == '"':
                in_string = False
            continue
        if ch == '"':
            in_string = True
        elif ch == "{":
            brace_depth += 1
        elif ch == "}":
            brace_depth -= 1
            if brace_depth == 0 and bracket_depth == 0:
                return text[start : i + 1]
        elif ch == "[":
            bracket_depth += 1
        elif ch == "]":
            bracket_depth -= 1
    return None


def _parse_lenient_embedded_payload(text: str, title: str) -> tuple[str, dict[str, Any] | None] | None:
    """Recover body/chart_data when Groq returns JSON with unescaped newlines in body."""
    stripped = text.strip()
    if not stripped.startswith("{") or '"body"' not in stripped or '"chart_data"' not in stripped:
        return None

    parts = _LENIENT_SPLIT.split(stripped, maxsplit=1)
    if len(parts) != 2:
        return None

    body_raw = _BODY_PREFIX.sub("", parts[0], count=1).strip()
    if body_raw.startswith('"'):
        body_raw = body_raw[1:]
    if body_raw.endswith('"'):
        body_raw = body_raw[:-1]
    body = body_raw.strip() or "Content unavailable."

    chart_text = parts[1].lstrip()
    chart = _parse_chart_from_suffix(chart_text, title)
    if chart is None:
        return None

    return body, chart


def _parse_embedded_payload(text: str, title: str) -> tuple[str, dict[str, Any] | None] | None:
    stripped = text.strip()
    if not stripped.startswith("{"):
        return None
    try:
        payload = json.loads(stripped)
    except json.JSONDecodeError:
        return _parse_lenient_embedded_payload(stripped, title)
    if not isinstance(payload, dict) or not isinstance(payload.get("body"), str):
        return None
    body = payload["body"].strip() or "Content unavailable."
    chart_raw = payload.get("chart_data")
    if isinstance(chart_raw, dict):
        chart_raw = _normalize_bar_payload(chart_raw)
    chart = validate_chart_data(title, chart_raw)
    return body, chart


def _unwrap_nested_body(body: str, title: str) -> tuple[str, dict[str, Any] | None]:
    """Unwrap body strings that contain another {"body":..., "chart_data":...} payload."""
    chart: dict[str, Any] | None = None
    while True:
        stripped = body.strip()
        if not stripped.startswith("{"):
            break
        parsed = _parse_embedded_payload(stripped, title)
        if parsed is None:
            break
        inner_body, inner_chart = parsed
        if inner_chart is not None:
            chart = inner_chart
        body = inner_body
    return body, chart


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
            body, nested_chart = _unwrap_nested_body(body, title)
            if nested_chart is not None:
                chart = nested_chart
            return body, chart
    except json.JSONDecodeError:
        pass

    lenient = _parse_lenient_embedded_payload(text, title)
    if lenient is not None:
        body, chart = lenient
        body, nested_chart = _unwrap_nested_body(body, title)
        if nested_chart is not None:
            chart = nested_chart
        return body, chart

    return text or "Content unavailable.", None

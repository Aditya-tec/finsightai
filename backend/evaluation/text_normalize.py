from __future__ import annotations

import re

# Western (132,180) and Indian (1,62,990) comma grouping
NUMBER_PATTERN = re.compile(r"\d+(?:,\d+)*(?:\.\d+)?%?")


def normalize_number(value: str) -> str:
    cleaned = value.strip().replace("₹", "").replace("$", "").replace("`", "").replace(",", "")
    if cleaned.endswith("%"):
        cleaned = cleaned[:-1]
    return cleaned


def extract_normalized_numbers(text: str) -> set[str]:
    return {normalize_number(match) for match in NUMBER_PATTERN.findall(text) if normalize_number(match)}


def normalize_text_for_match(text: str) -> str:
    lowered = text.lower()
    for symbol in ("₹", "$", "`", ","):
        lowered = lowered.replace(symbol, "")
    return lowered.strip(".,;:!?()[]\"'")

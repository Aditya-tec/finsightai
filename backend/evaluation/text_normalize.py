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


def _number_variants(n: str) -> list[str]:
    variants = [n]
    try:
        value = float(n)
        variants.append(f"{value:.1f}")
        if value == int(value):
            variants.append(str(int(value)))
    except ValueError:
        pass
    return list(dict.fromkeys(variants))


def is_orphan_year_fragment(n: str, context_blob: str, answer: str) -> bool:
    """Ignore 3-digit year prefixes (e.g. 202 from truncated 2025) when full years exist."""
    if len(n) != 3 or not n.isdigit() or not n.startswith("20"):
        return False
    if re.search(rf"\b{n}\d\b", context_blob):
        return True
    if re.search(rf"\b{n}\s*$", answer.strip()):
        return True
    return False


def is_number_grounded(n: str, context_blob: str, context_numbers: set[str] | None = None) -> bool:
    """Return True if a numeric claim appears supported by source text."""
    if context_numbers is None:
        context_numbers = extract_normalized_numbers(context_blob)

    for variant in _number_variants(n):
        if variant in context_numbers:
            return True

        escaped = re.escape(variant)
        # Percentage forms: 6.5%, 6.5 %, 6.5 per cent
        if re.search(
            rf"(?<!\d){escaped}\s*(?:%|per\s+cent|percent)\b",
            context_blob,
            re.IGNORECASE,
        ):
            return True

        # Comma-stripped word boundary (handles 68,375 and inline decimals)
        flat = context_blob.replace(",", "")
        if re.search(rf"(?<!\d){escaped}(?!\d)", flat):
            return True

    return False


def normalize_text_for_match(text: str) -> str:
    lowered = text.lower()
    for symbol in ("₹", "$", "`", ","):
        lowered = lowered.replace(symbol, "")
    return lowered.strip(".,;:!?()[]\"'")

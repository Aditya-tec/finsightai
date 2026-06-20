from __future__ import annotations

import re

# Western (132,180) and Indian (1,62,990) comma grouping
NUMBER_PATTERN = re.compile(r"\d+(?:,\d+)*(?:\.\d+)?%?")

UNIT_HEADER_PATTERN = re.compile(
    r"(?:`|₹|rs\.?\s*)?\s*in\s+(?:[''`]?000s|000'?s|million|crore|crores|lakh|lakhs)\b",
    re.IGNORECASE,
)

SCALE_SUFFIX_PATTERN = re.compile(
    r"\b(billion|million|crore|crores|cr|lakh|lakhs|thousand|thousands)\b",
    re.IGNORECASE,
)


def normalize_number(value: str) -> str:
    cleaned = value.strip().replace("₹", "").replace("$", "").replace("`", "").replace(",", "")
    if cleaned.endswith("%"):
        cleaned = cleaned[:-1]
    return cleaned


def extract_normalized_numbers(text: str) -> set[str]:
    return {normalize_number(match) for match in NUMBER_PATTERN.findall(text) if normalize_number(match)}


def _parse_float(n: str) -> float | None:
    try:
        return float(n)
    except ValueError:
        return None


def _scale_to_rupees_multiplier(scale: str | None) -> float | None:
    if not scale:
        return None
    s = scale.lower().strip(".")
    if s in {"000s", "000's", "'000s", "thousand", "thousands"}:
        return 1_000.0
    if s in {"million", "mn", "m"}:
        return 1_000_000.0
    if s in {"crore", "crores", "cr"}:
        return 10_000_000.0
    if s in {"lakh", "lakhs"}:
        return 100_000.0
    if s == "billion":
        return 1_000_000_000.0
    return None


def _detect_context_unit(text: str, position: int) -> str | None:
    """Read filing unit label from text preceding a number (e.g. ` in '000s)."""
    window = text[max(0, position - 220) : position]
    match = UNIT_HEADER_PATTERN.search(window)
    if not match:
        return None
    fragment = match.group(0).lower()
    if "000" in fragment:
        return "000s"
    if "million" in fragment:
        return "million"
    if "crore" in fragment:
        return "crore"
    if "lakh" in fragment:
        return "lakh"
    return None


def _detect_suffix_scale(text: str, start: int, end: int) -> str | None:
    """Detect scale word immediately after a number (e.g. 2,945.87 billion)."""
    tail = text[end : min(len(text), end + 24)]
    match = SCALE_SUFFIX_PATTERN.match(tail.lstrip(" )"))
    return match.group(1).lower() if match else None


def _rupees_from_occurrence(text: str, raw: str, start: int, end: int) -> float | None:
    numeric = _parse_float(normalize_number(raw))
    if numeric is None:
        return None

    suffix = _detect_suffix_scale(text, start, end)
    if suffix:
        mult = _scale_to_rupees_multiplier(suffix)
        return numeric * mult if mult else None

    context_unit = _detect_context_unit(text, start)
    if context_unit:
        mult = _scale_to_rupees_multiplier(context_unit)
        return numeric * mult if mult else None

    return numeric


def _extract_rupee_occurrences(text: str) -> list[float]:
    values: list[float] = []
    for match in NUMBER_PATTERN.finditer(text):
        raw = match.group(0)
        if raw.endswith("%"):
            continue
        rupees = _rupees_from_occurrence(text, raw, match.start(), match.end())
        if rupees is not None:
            values.append(rupees)
    return values


def _numbers_equivalent(a: float, b: float, rtol: float = 0.002) -> bool:
    if a == b:
        return True
    denom = max(abs(a), abs(b), 1.0)
    return abs(a - b) / denom <= rtol


def _number_variants(n: str) -> list[str]:
    variants = [n]
    try:
        value = float(n)
        variants.append(f"{value:.1f}")
        variants.append(f"{value:.2f}")
        if value == int(value):
            variants.append(str(int(value)))
    except ValueError:
        pass
    return list(dict.fromkeys(variants))


def _cross_scale_equivalents(value: float) -> set[float]:
    """Map a bare number to common filing/answer scale interpretations (in rupees)."""
    equivalents = {value}
    # Table in '000s ↔ answer stated in billions
    equivalents.add(value * 1_000)  # raw '000s → rupees
    equivalents.add(value * 1_000_000)  # billions figure ↔ '000s table entry
    equivalents.add(value * 1_000_000_000)  # plain rupees
    equivalents.add(value * 10_000_000)  # crores
    equivalents.add(value * 100_000)  # lakhs
    equivalents.add(value * 1_000_000)  # millions
    if value != 0:
        equivalents.add(value / 1_000)
        equivalents.add(value / 1_000_000)
        equivalents.add(value / 1_000_000_000)
    return equivalents


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
    """Return True if a numeric claim appears supported by source text (context-only checks)."""
    if context_numbers is None:
        context_numbers = extract_normalized_numbers(context_blob)

    for variant in _number_variants(n):
        if variant in context_numbers:
            return True

        escaped = re.escape(variant)
        if re.search(
            rf"(?<!\d){escaped}\s*(?:%|per\s+cent|percent)\b",
            context_blob,
            re.IGNORECASE,
        ):
            return True

        flat = context_blob.replace(",", "")
        if re.search(rf"(?<!\d){escaped}(?!\d)", flat):
            return True

    answer_value = _parse_float(n)
    if answer_value is not None:
        context_rupees = _extract_rupee_occurrences(context_blob)
        for ctx in context_rupees:
            for equiv in _cross_scale_equivalents(answer_value):
                if _numbers_equivalent(equiv, ctx):
                    return True

    return False


def is_number_grounded_in_answer(
    n: str,
    answer: str,
    context_blob: str,
    context_numbers: set[str] | None = None,
) -> bool:
    """Ground a number from the answer against context, using scale-aware matching."""
    if is_orphan_year_fragment(n, context_blob, answer):
        return True

    if context_numbers is None:
        context_numbers = extract_normalized_numbers(context_blob)

    for variant in _number_variants(n):
        if variant in context_numbers:
            return True

        escaped = re.escape(variant)
        if re.search(
            rf"(?<!\d){escaped}\s*(?:%|per\s+cent|percent)\b",
            context_blob,
            re.IGNORECASE,
        ):
            return True

        flat = context_blob.replace(",", "")
        if re.search(rf"(?<!\d){escaped}(?!\d)", flat):
            return True

    # Find answer occurrences of this number and compare in rupee space
    context_rupees = _extract_rupee_occurrences(context_blob)
    if not context_rupees:
        return False

    for match in NUMBER_PATTERN.finditer(answer):
        raw = match.group(0)
        if raw.endswith("%"):
            continue
        if normalize_number(raw) != n and normalize_number(raw) not in _number_variants(n):
            continue

        answer_rupees = _rupees_from_occurrence(answer, raw, match.start(), match.end())
        if answer_rupees is None:
            continue

        for ctx in context_rupees:
            if _numbers_equivalent(answer_rupees, ctx):
                return True

        # Answer number without explicit suffix — try common analyst conversions
        bare = _parse_float(normalize_number(raw))
        if bare is not None:
            for equiv in _cross_scale_equivalents(bare):
                for ctx in context_rupees:
                    if _numbers_equivalent(equiv, ctx):
                        return True

    return False


def normalize_text_for_match(text: str) -> str:
    lowered = text.lower()
    for symbol in ("₹", "$", "`", ","):
        lowered = lowered.replace(symbol, "")
    return lowered.strip(".,;:!?()[]\"'")

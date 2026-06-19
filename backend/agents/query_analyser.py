from __future__ import annotations


def break_into_subquestions(query: str) -> list[str]:
    parts = [p.strip() for p in query.replace("?", ".").split(".") if p.strip()]
    if not parts:
        return [query]
    return parts[:5]

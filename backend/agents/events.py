from __future__ import annotations

from typing import Any, Callable

EventCallback = Callable[[str, dict[str, Any]], None]


def emit(on_event: EventCallback | None, event_type: str, payload: dict[str, Any] | None = None) -> None:
    if on_event is None:
        return
    on_event(event_type, payload or {})

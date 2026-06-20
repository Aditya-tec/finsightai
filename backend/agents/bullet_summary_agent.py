from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path

from groq import Groq, RateLimitError

from settings import BASE_DIR, settings

BULLET_CACHE_DIR = BASE_DIR / "data" / "bullet_cache"

SYSTEM_PROMPT = (
    "You convert equity research paragraphs into concise bullet points. "
    "Return ONLY a JSON array of 3 to 5 strings. "
    "Preserve all key figures, percentages, and facts exactly as stated. "
    "Do not add new information or speculation."
)


def _body_hash(body: str) -> str:
    return hashlib.sha256(body.encode("utf-8")).hexdigest()[:16]


def _cache_path(body: str) -> Path:
    return BULLET_CACHE_DIR / f"{_body_hash(body)}.json"


def _load_disk_cache(body: str) -> list[str] | None:
    path = _cache_path(body)
    if not path.is_file():
        return None
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        bullets = data.get("bullets")
        if isinstance(bullets, list) and all(isinstance(b, str) for b in bullets):
            return bullets
    except (json.JSONDecodeError, OSError):
        pass
    return None


def _save_disk_cache(body: str, bullets: list[str]) -> None:
    BULLET_CACHE_DIR.mkdir(parents=True, exist_ok=True)
    _cache_path(body).write_text(
        json.dumps({"bullets": bullets}, ensure_ascii=False),
        encoding="utf-8",
    )


def _parse_bullets(raw: str) -> list[str]:
    text = raw.strip()
    fence = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if fence:
        text = fence.group(1).strip()
    if text.startswith("["):
        parsed = json.loads(text)
        if isinstance(parsed, list):
            bullets = [str(b).strip() for b in parsed if str(b).strip()]
            if bullets:
                return bullets[:5]
    raise ValueError("invalid bullet JSON")


def _fallback_bullets(body: str) -> list[str]:
    sentences = re.split(r"(?<=[.!?])\s+", body.strip())
    sentences = [s.strip() for s in sentences if len(s.strip()) > 20]
    if not sentences:
        chunk = body.strip()[:400]
        return [chunk] if chunk else ["No summary available."]
    return sentences[:5]


def summarize_section_bullets(title: str, body: str) -> list[str]:
    cached = _load_disk_cache(body)
    if cached:
        return cached

    if not settings.groq_api_key:
        return _fallback_bullets(body)

    client = Groq(api_key=settings.groq_api_key)
    user_content = f"Section: {title}\n\nParagraph:\n{body.strip()}"

    try:
        response = client.chat.completions.create(
            model=settings.groq_report_model,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_content},
            ],
            temperature=0.2,
            max_tokens=512,
        )
        raw = (response.choices[0].message.content or "").strip()
        bullets = _parse_bullets(raw)
    except (json.JSONDecodeError, ValueError, KeyError, IndexError):
        bullets = _fallback_bullets(body)
    except RateLimitError:
        raise

    _save_disk_cache(body, bullets)
    return bullets

from __future__ import annotations

import hashlib
from functools import lru_cache

import numpy as np

from settings import settings

try:
    from sentence_transformers import SentenceTransformer
except ImportError:  # pragma: no cover
    SentenceTransformer = None


@lru_cache(maxsize=1)
def _get_model():
    if SentenceTransformer is None:
        return None
    return SentenceTransformer(settings.embedding_model)


def _fallback_embedding(text: str, dim: int = 384) -> list[float]:
    digest = hashlib.sha256(text.encode("utf-8")).digest()
    raw = np.frombuffer(digest * ((dim // len(digest)) + 1), dtype=np.uint8)[:dim]
    vec = raw.astype(np.float32)
    norm = np.linalg.norm(vec) or 1.0
    return (vec / norm).tolist()


def embed_text(text: str) -> list[float]:
    model = _get_model()
    if model is None:
        return _fallback_embedding(text)
    vector = model.encode(text, normalize_embeddings=True)
    return vector.tolist()

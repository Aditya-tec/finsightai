import os
from dataclasses import dataclass, field
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
ENV_PATH = BASE_DIR / ".env"


def _env(name: str, default: str = "") -> str:
    load_dotenv(ENV_PATH, override=True)
    return os.getenv(name, default)


@dataclass
class Settings:
    embedding_model: str = field(
        default_factory=lambda: _env("HF_EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
    )
    bm25_index_path: str = field(
        default_factory=lambda: _env("BM25_INDEX_PATH", str(BASE_DIR / "bm25_index.pkl"))
    )
    graph_path: str = field(default_factory=lambda: _env("GRAPH_PATH", str(BASE_DIR / "graph.json")))
    raw_data_dir: str = field(
        default_factory=lambda: _env("DATA_RAW_DIR", str(BASE_DIR.parent / "data" / "raw"))
    )
    parsed_data_dir: str = field(
        default_factory=lambda: _env("DATA_PARSED_DIR", str(BASE_DIR.parent / "data" / "parsed"))
    )
    supabase_filings_bucket: str = field(
        default_factory=lambda: _env("SUPABASE_FILINGS_BUCKET", "annual-filings")
    )

    @property
    def groq_api_key(self) -> str:
        return _env("GROQ_API_KEY")

    @property
    def groq_report_model(self) -> str:
        return _env("GROQ_REPORT_MODEL", "llama-3.3-70b-versatile")

    @property
    def cohere_api_key(self) -> str:
        return _env("COHERE_API_KEY")

    @property
    def supabase_url(self) -> str:
        return _env("SUPABASE_URL")

    @property
    def supabase_key(self) -> str:
        return _env("SUPABASE_KEY")

    @property
    def api_key(self) -> str:
        return _env("API_KEY")

    @property
    def proxy_secret(self) -> str:
        """Shared secret: only the Vercel server proxy should send X-Proxy-Secret."""
        return _env("PROXY_SECRET")

    @property
    def cors_origins(self) -> list[str]:
        raw = _env("CORS_ORIGINS", "")
        if raw.strip():
            return [origin.strip() for origin in raw.split(",") if origin.strip()]
        return [
            "https://finsightai-tau.vercel.app",
            "http://localhost:3000",
            "http://127.0.0.1:3000",
        ]

    @property
    def cors_origin_regex(self) -> str:
        return _env("CORS_ORIGIN_REGEX", r"https://.*\.vercel\.app")


settings = Settings()

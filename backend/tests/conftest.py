from __future__ import annotations

import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))


@pytest.fixture(autouse=True)
def _isolate_auth_from_dotenv(monkeypatch: pytest.MonkeyPatch) -> None:
    """Keep CI/local pytest independent of developer .env API_KEY / PROXY_SECRET."""
    import settings as settings_module

    monkeypatch.setattr(settings_module, "ENV_PATH", Path("__missing_rupeeread_env__.env"))
    monkeypatch.setenv("API_KEY", "")
    monkeypatch.setenv("PROXY_SECRET", "")

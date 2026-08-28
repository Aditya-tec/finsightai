from __future__ import annotations

from unittest.mock import PropertyMock, patch

from fastapi.testclient import TestClient

from main import app
from settings import settings


def _client() -> TestClient:
    return TestClient(app)


def test_proxy_secret_required_for_api() -> None:
    with (
        patch.object(type(settings), "proxy_secret", new_callable=PropertyMock, return_value="proxy-test"),
        patch.object(type(settings), "api_key", new_callable=PropertyMock, return_value="api-test"),
    ):
        client = _client()
        assert client.get("/api/companies").status_code == 403
        assert (
            client.get(
                "/api/companies",
                headers={"X-Proxy-Secret": "proxy-test", "X-API-Key": "api-test"},
            ).status_code
            == 200
        )


def test_documents_require_api_key_when_configured() -> None:
    with (
        patch.object(type(settings), "proxy_secret", new_callable=PropertyMock, return_value=""),
        patch.object(type(settings), "api_key", new_callable=PropertyMock, return_value="api-test"),
    ):
        client = _client()
        assert client.get("/api/documents/TCS/FY25/status").status_code == 401
        assert (
            client.get(
                "/api/documents/TCS/FY25/status",
                headers={"X-API-Key": "api-test"},
            ).status_code
            in (200, 404)
        )


def test_health_stays_public_with_proxy_secret() -> None:
    with patch.object(type(settings), "proxy_secret", new_callable=PropertyMock, return_value="proxy-test"):
        client = _client()
        assert client.get("/health").status_code == 200

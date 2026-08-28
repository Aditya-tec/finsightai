from __future__ import annotations

from fastapi.testclient import TestClient

from main import app


def test_cors_allows_localhost_preflight() -> None:
    client = TestClient(app)
    response = client.options(
        "/health",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert response.headers.get("access-control-allow-origin") == "http://localhost:3000"


def test_cors_allows_vercel_preview_origin() -> None:
    client = TestClient(app)
    response = client.get(
        "/health",
        headers={"Origin": "https://finsightai-preview.vercel.app"},
    )
    assert response.headers.get("access-control-allow-origin") == "https://finsightai-preview.vercel.app"


def test_cors_blocks_unknown_origin() -> None:
    client = TestClient(app)
    response = client.get(
        "/health",
        headers={"Origin": "https://evil.example.com"},
    )
    assert response.status_code == 200
    assert "access-control-allow-origin" not in response.headers

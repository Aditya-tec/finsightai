from __future__ import annotations

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

from settings import settings


def _is_public_path(path: str, method: str) -> bool:
    if method == "OPTIONS":
        return True
    if path == "/health" or path.startswith("/docs") or path == "/openapi.json":
        return True
    return False


class ApiKeyMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        if _is_public_path(path, request.method):
            return await call_next(request)

        proxy_secret = settings.proxy_secret
        if proxy_secret:
            provided_proxy = request.headers.get("X-Proxy-Secret", "")
            if provided_proxy != proxy_secret:
                return JSONResponse(
                    status_code=403,
                    content={"detail": "Forbidden"},
                )

        api_key = settings.api_key
        if not api_key:
            return await call_next(request)

        if path.startswith("/api/"):
            provided = request.headers.get("X-API-Key", "")
            if provided != api_key:
                return JSONResponse(
                    status_code=401,
                    content={"detail": "Invalid or missing API key"},
                )

        return await call_next(request)

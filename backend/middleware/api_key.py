from __future__ import annotations

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

from settings import settings


class ApiKeyMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        api_key = settings.api_key
        if not api_key:
            return await call_next(request)

        path = request.url.path
        if request.method == "OPTIONS" or path == "/health" or path.startswith("/docs") or path == "/openapi.json":
            return await call_next(request)

        if path.startswith("/api/"):
            provided = request.headers.get("X-API-Key", "")
            if provided != api_key:
                return JSONResponse(
                    status_code=401,
                    content={"detail": "Invalid or missing API key"},
                )

        return await call_next(request)

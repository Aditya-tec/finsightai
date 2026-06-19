from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from groq import RateLimitError

from routers.chat import router as chat_router
from routers.report import router as report_router
from routers.stream import router as stream_router
from routers.companies import router as companies_router

app = FastAPI(title="FinSight AI API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat_router, prefix="/api", tags=["chat"])
app.include_router(report_router, prefix="/api", tags=["report"])
app.include_router(stream_router, prefix="/api", tags=["stream"])
app.include_router(companies_router, prefix="/api", tags=["companies"])


@app.exception_handler(RateLimitError)
async def groq_rate_limit_handler(_request: Request, _exc: RateLimitError):
    return JSONResponse(
        status_code=429,
        content={"detail": "Groq rate limit reached. Wait a few minutes and retry."},
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(_request: Request, exc: HTTPException):
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


@app.get("/health")
async def health() -> dict:
    return {"status": "ok", "service": "finsight-backend"}

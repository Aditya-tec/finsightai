import logging

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from groq import RateLimitError

from middleware.api_key import ApiKeyMiddleware
from document_corpus import count_available_pdfs, pdf_path
from routers.chat import router as chat_router
from routers.companies import NIFTY20, router as companies_router
from routers.conversations import router as conversations_router
from routers.documents import router as documents_router
from routers.report import router as report_router
from routers.stream import router as stream_router
from routers.summarize import router as summarize_router

logger = logging.getLogger("rupeeread")

app = FastAPI(title="RupeeRead API", version="0.1.0")


@app.on_event("startup")
async def log_document_inventory() -> None:
    tickers = [c["ticker"] for c in NIFTY20]
    found, total = count_available_pdfs(tickers)
    logger.info("Annual report PDFs: %s/%s in %s", found, total, pdf_path("TCS", "FY25").parent)
    if found < total:
        logger.warning(
            "Missing PDFs — citation source viewer will use parsed text fallback. "
            "Drop files as data/raw/{TICKER}_FY25.pdf or run scripts/01_download_pdfs.py"
        )

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(ApiKeyMiddleware)

app.include_router(chat_router, prefix="/api", tags=["chat"])
app.include_router(report_router, prefix="/api", tags=["report"])
app.include_router(stream_router, prefix="/api", tags=["stream"])
app.include_router(companies_router, prefix="/api", tags=["companies"])
app.include_router(summarize_router, prefix="/api", tags=["summarize"])
app.include_router(conversations_router, prefix="/api", tags=["conversations"])
app.include_router(documents_router, prefix="/api", tags=["documents"])


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
    return {"status": "ok", "service": "rupeeread-backend"}

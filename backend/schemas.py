from typing import Any

from pydantic import BaseModel, Field


class FollowUpMessage(BaseModel):
    role: str
    content: str
    citations: list[dict[str, Any]] = Field(default_factory=list)


class ChatRequest(BaseModel):
    query: str
    ticker: str | None = None
    tickers: list[str] = Field(default_factory=list)
    session_id: str | None = None
    conversation_history: list[FollowUpMessage] = Field(default_factory=list)


class Citation(BaseModel):
    source: str
    page: int | None = None
    section: str | None = None
    ticker: str | None = None
    fiscal_year: str | None = None
    document_key: str | None = None
    page_valid: bool | None = None
    page_mismatch: bool | None = None


class ChatResponse(BaseModel):
    answer: str
    citations: list[Citation]
    eval_scores: dict[str, Any]
    sources: list[str]
    tickers: list[str] = Field(default_factory=list)


class ReportRequest(BaseModel):
    ticker: str
    force_refresh: bool = False


class ReportSection(BaseModel):
    title: str
    body: str
    citations: list[Citation] = Field(default_factory=list)
    chart_data: dict[str, Any] | None = None


class ReportResponse(BaseModel):
    sections: list[ReportSection]
    citations: list[Citation]
    eval_scores: dict[str, Any]
    sources: list[str]
    generated_at: str | None = None


class SummarizeBulletsRequest(BaseModel):
    title: str
    body: str


class SummarizeBulletsResponse(BaseModel):
    bullets: list[str]

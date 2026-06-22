from typing import Any

from pydantic import BaseModel, Field


class FollowUpMessage(BaseModel):
    role: str
    content: str
    citations: list[dict[str, Any]] = Field(default_factory=list)


class ChatRequest(BaseModel):
    query: str
    ticker: str | None = None
    conversation_history: list[FollowUpMessage] = Field(default_factory=list)


class Citation(BaseModel):
    source: str
    page: int | None = None
    section: str | None = None


class ChatResponse(BaseModel):
    answer: str
    citations: list[Citation]
    eval_scores: dict[str, Any]
    sources: list[str]


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

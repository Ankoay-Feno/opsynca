from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class IndexedDocument(BaseModel):
    document_id: str
    filename: str | None
    content_type: str | None
    chunks: int


class IndexResponse(BaseModel):
    message: str
    document_id: str
    filename: str
    content_type: str | None
    extension: str
    chunks: int
    cleaned_content: str
    warnings: list[str]


class HistoryMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1)
    top_k: int = Field(default=5, ge=1, le=12)
    history: list[HistoryMessage] = Field(default_factory=list)


class ChatSource(BaseModel):
    document_id: str | None
    filename: str | None
    chunk_index: int | None
    score: float | None
    text: str


class WebSource(BaseModel):
    uri: str
    title: str | None = None


class ChatResponse(BaseModel):
    answer: str
    sources: list[ChatSource]
    web_sources: list[WebSource] = Field(default_factory=list)

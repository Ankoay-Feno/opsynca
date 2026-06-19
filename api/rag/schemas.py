from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class ExtractResponse(BaseModel):
    filename: str
    content_type: str | None
    extension: str
    text: str
    warnings: list[str] = Field(default_factory=list)


class EmbedRequest(BaseModel):
    texts: list[str] = Field(..., min_length=1)


class EmbedResponse(BaseModel):
    embeddings: list[list[float]]


class HistoryMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(..., max_length=20_000)


class ContextChunk(BaseModel):
    filename: str | None = Field(default=None, max_length=500)
    chunk_index: int | None = None
    text: str = Field(..., min_length=1, max_length=50_000)


class AnswerRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=8_000)
    context: list[ContextChunk] = Field(default_factory=list, max_length=50)
    history: list[HistoryMessage] = Field(default_factory=list, max_length=50)


class WebSource(BaseModel):
    uri: str
    title: str | None = None


class AnswerResponse(BaseModel):
    answer: str
    used_context_indices: list[int] = Field(default_factory=list)
    web_sources: list[WebSource] = Field(default_factory=list)


class TitleRequest(BaseModel):
    messages: list[HistoryMessage] = Field(..., min_length=1)


class TitleResponse(BaseModel):
    title: str

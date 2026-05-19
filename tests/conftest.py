from __future__ import annotations

from collections.abc import Iterator
from typing import Any

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def settings():
    from api.config import Settings, get_settings

    get_settings.cache_clear()
    s = Settings(
        litellm_model="gemini/gemini-2.5-flash-lite",
        embedding_model="gemini/gemini-embedding-001",
    )
    yield s
    get_settings.cache_clear()


@pytest.fixture
def app(settings):
    from api.config import get_settings
    from api.main import app as fastapi_app

    fastapi_app.dependency_overrides[get_settings] = lambda: settings
    yield fastapi_app
    fastapi_app.dependency_overrides.clear()


@pytest.fixture
def client(app) -> Iterator[TestClient]:
    with TestClient(app) as test_client:
        yield test_client


class FakeLiteLLM:
    def __init__(self, *, embedding_dim: int = 4, chat_payload: dict[str, Any] | None = None) -> None:
        self.embedding_dim = embedding_dim
        self.embed_calls: list[list[str]] = []
        self.chat_calls: list[dict[str, Any]] = []
        self._chat_payload = chat_payload or {
            "choices": [
                {
                    "message": {
                        "content": "Reponse de test.\nSOURCES_UTILISEES: aucune",
                    }
                }
            ]
        }

    def __call__(self, _settings):
        return self

    async def embed(self, texts: list[str]) -> list[list[float]]:
        self.embed_calls.append(list(texts))
        return [[float(i + 1)] * self.embedding_dim for i in range(len(texts))]

    async def chat(self, messages, *, response_format=None, tools=None):
        self.chat_calls.append({
            "messages": messages,
            "response_format": response_format,
            "tools": tools,
        })
        return self._chat_payload


@pytest.fixture
def fake_litellm(monkeypatch):
    fake = FakeLiteLLM()
    monkeypatch.setattr("api.rag.router.LiteLLMClient", fake)
    return fake

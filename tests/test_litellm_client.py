from __future__ import annotations

import pytest
from fastapi import HTTPException

from api.config import Settings
from api.litellm_client import LiteLLMClient


def _settings(**overrides) -> Settings:
    base = dict(
        litellm_model="gemini/gemini-2.5-flash-lite",
        embedding_model="gemini/gemini-embedding-001",
    )
    base.update(overrides)
    return Settings(**base)


async def test_embed_returns_empty_for_no_texts():
    client = LiteLLMClient(_settings(embedding_backend="local"))
    assert await client.embed([]) == []


async def test_embed_local_backend_uses_fastembed(monkeypatch):
    calls: list[tuple] = []

    def fake_embed_local(model_name, texts, cache_dir=None):
        calls.append((model_name, list(texts), cache_dir))
        return [[0.1, 0.2] for _ in texts]

    monkeypatch.setattr("api.rag.local_embedder.embed_local", fake_embed_local)
    client = LiteLLMClient(_settings(embedding_backend="local", local_embedding_model="m"))

    result = await client.embed(["a", "b"])

    assert result == [[0.1, 0.2], [0.1, 0.2]]
    assert calls == [("m", ["a", "b"], None)]


async def test_embed_local_failure_raises_503(monkeypatch):
    def boom(*_args, **_kwargs):
        raise RuntimeError("modele introuvable")

    monkeypatch.setattr("api.rag.local_embedder.embed_local", boom)
    client = LiteLLMClient(_settings(embedding_backend="local"))

    with pytest.raises(HTTPException) as exc:
        await client.embed(["x"])
    assert exc.value.status_code == 503


async def test_embed_cloud_backend_sorts_by_index(monkeypatch):
    async def fake_aembedding(*, model, input):
        # Volontairement dans le desordre pour verifier le tri par index.
        return {"data": [
            {"index": 1, "embedding": [9.0]},
            {"index": 0, "embedding": [1.0]},
        ]}

    monkeypatch.setattr("api.litellm_client.litellm.aembedding", fake_aembedding)
    client = LiteLLMClient(_settings(embedding_backend="cloud"))

    result = await client.embed(["a", "b"])

    assert result == [[1.0], [9.0]]

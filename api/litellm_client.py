from __future__ import annotations

import asyncio
from typing import Any

import litellm
from fastapi import HTTPException

from api.config import Settings


_CHAT_FALLBACKS = [
    "groq/qwen/qwen3-32b",
    "mistral/mistral-small-latest",
    "huggingface/meta-llama/Llama-4-Scout-17B-16E-Instruct",
]


class LiteLLMClient:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    async def embed(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []
        if self.settings.embedding_backend == "local":
            return await self._embed_local(texts)
        return await self._embed_cloud(texts)

    async def _embed_local(self, texts: list[str]) -> list[list[float]]:
        # fastembed est synchrone et CPU-bound : on l'isole dans un thread pour
        # ne pas bloquer l'event loop. Pas de fallback vers le cloud ici : un
        # modele cloud a une dimension differente et casserait le retrieval.
        from api.rag.local_embedder import embed_local

        try:
            return await asyncio.to_thread(
                embed_local,
                self.settings.local_embedding_model,
                texts,
                self.settings.embedding_cache_dir,
            )
        except Exception as exc:
            raise HTTPException(
                status_code=503,
                detail={"message": "Local embedding failed.", "error": str(exc)},
            ) from exc

    async def _embed_cloud(self, texts: list[str]) -> list[list[float]]:
        try:
            response = await litellm.aembedding(
                model=self.settings.embedding_model,
                input=texts,
            )
        except Exception as exc:
            raise HTTPException(
                status_code=502,
                detail={"message": "Embedding call failed.", "error": str(exc)},
            ) from exc
        data = sorted(response["data"], key=lambda item: item["index"])
        return [item["embedding"] for item in data]

    async def chat(
        self,
        messages: list[dict[str, str]],
        *,
        response_format: dict[str, Any] | None = None,
        tools: list[dict[str, Any]] | None = None,
    ) -> dict[str, Any]:
        kwargs: dict[str, Any] = {
            "model": self.settings.litellm_model,
            "messages": messages,
            # fallbacks via SDK : si le primaire echoue, LiteLLM bascule sur le suivant.
            "fallbacks": [m for m in _CHAT_FALLBACKS if m != self.settings.litellm_model],
            # drop_params: retire les parametres non supportes par le provider cible.
            "drop_params": True,
            "num_retries": 0,
            "timeout": 90,
        }
        if response_format is not None:
            kwargs["response_format"] = response_format
        if tools is not None:
            kwargs["tools"] = tools
        try:
            response = await litellm.acompletion(**kwargs)
        except Exception as exc:
            raise HTTPException(
                status_code=502,
                detail={"message": "Completion call failed.", "error": str(exc)},
            ) from exc
        return response.model_dump() if hasattr(response, "model_dump") else dict(response)

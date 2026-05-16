from typing import Any

import httpx
from fastapi import HTTPException

from api.config import Settings


class LiteLLMClient:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    def _headers(self) -> dict[str, str]:
        if not self.settings.litellm_master_key:
            raise HTTPException(status_code=500, detail="LITELLM_MASTER_KEY est manquant.")

        return {
            "Authorization": f"Bearer {self.settings.litellm_master_key}",
            "Content-Type": "application/json",
        }

    async def embed(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []

        body = {"model": self.settings.embedding_model, "input": texts}
        response = await self._post("/embeddings", body)
        self._raise_for_proxy_error(response)
        data = response.json().get("data", [])
        return [item["embedding"] for item in sorted(data, key=lambda item: item["index"])]

    async def chat(
        self,
        messages: list[dict[str, str]],
        *,
        response_format: dict[str, Any] | None = None,
        tools: list[dict[str, Any]] | None = None,
    ) -> dict[str, Any]:
        body: dict[str, Any] = {"model": self.settings.litellm_model, "messages": messages}
        if response_format is not None:
            body["response_format"] = response_format
        if tools is not None:
            body["tools"] = tools
        response = await self._post("/chat/completions", body)
        self._raise_for_proxy_error(response)
        return response.json()

    async def _post(self, path: str, body: dict[str, Any]) -> httpx.Response:
        url = f"{self.settings.litellm_proxy_url}{path}"
        async with httpx.AsyncClient(timeout=90) as client:
            try:
                return await client.post(url, headers=self._headers(), json=body)
            except httpx.RequestError as exc:
                raise HTTPException(
                    status_code=503,
                    detail={
                        "message": "LiteLLM proxy is unavailable.",
                        "url": url,
                        "error": str(exc),
                    },
                ) from exc

    @staticmethod
    def _raise_for_proxy_error(response: httpx.Response) -> None:
        if response.is_error:
            raise HTTPException(status_code=response.status_code, detail=response.text)

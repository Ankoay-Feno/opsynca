import os
from typing import Any

import httpx
from fastapi import APIRouter, FastAPI, HTTPException
from pydantic import BaseModel, Field


LITELLM_PROXY_URL = os.getenv("LITELLM_PROXY_URL", "http://localhost:4000")
LITELLM_MODEL = os.getenv("LITELLM_MODEL", "portfolio-agent")


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, examples=["Presente-toi rapidement."])
    system_prompt: str = Field(
        default="Tu es l agent personnel d Ankoay. Reponds avec le CV fourni.",
        min_length=1,
    )


class ChatResponse(BaseModel):
    answer: str
    model: str | None = None
    usage: dict[str, Any] | None = None


app = FastAPI(
    title="Portfolio Agent API",
    version="0.1.0",
    description="Simple API Swagger pour discuter avec l'agent portfolio via LiteLLM Proxy.",
)

router = APIRouter(prefix="/api", tags=["agent"])


def get_litellm_master_key() -> str:
    master_key = os.getenv("LITELLM_MASTER_KEY")
    if not master_key:
        raise HTTPException(
            status_code=500,
            detail="LITELLM_MASTER_KEY est manquant dans l'environnement du serveur API.",
        )
    return master_key


@app.get("/", tags=["system"])
async def root() -> dict[str, str]:
    return {"message": "Swagger est disponible sur /docs"}


@router.get("/health")
async def health() -> dict[str, str]:
    return {
        "status": "ok",
        "litellm_proxy_url": LITELLM_PROXY_URL,
        "litellm_model": LITELLM_MODEL,
    }


@router.get("/models")
async def models() -> dict[str, Any]:
    master_key = get_litellm_master_key()
    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.get(
            f"{LITELLM_PROXY_URL}/models",
            headers={"Authorization": f"Bearer {master_key}"},
        )

    if response.is_error:
        raise HTTPException(status_code=response.status_code, detail=response.text)

    return response.json()


@router.post("/chat", response_model=ChatResponse)
async def chat(payload: ChatRequest) -> ChatResponse:
    master_key = get_litellm_master_key()
    request_body = {
        "model": LITELLM_MODEL,
        "messages": [
            {"role": "system", "content": payload.system_prompt},
            {"role": "user", "content": payload.message},
        ],
    }

    async with httpx.AsyncClient(timeout=60) as client:
        response = await client.post(
            f"{LITELLM_PROXY_URL}/chat/completions",
            headers={
                "Authorization": f"Bearer {master_key}",
                "Content-Type": "application/json",
            },
            json=request_body,
        )

    if response.is_error:
        raise HTTPException(status_code=response.status_code, detail=response.text)

    data = response.json()
    message = data["choices"][0]["message"]
    return ChatResponse(
        answer=message.get("content", ""),
        model=data.get("model"),
        usage=data.get("usage"),
    )


app.include_router(router)

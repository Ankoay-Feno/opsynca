import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.rag.router import router as rag_router

_DEFAULT_ORIGINS = "*"


def _normalize_origin(origin: str) -> str:
    origin = origin.strip()
    if origin == "*":
        return origin
    return origin.rstrip("/")


def _parse_origins(raw: str) -> list[str]:
    origins: list[str] = []
    for item in raw.split(","):
        origin = _normalize_origin(item)
        if origin and origin not in origins:
            origins.append(origin)
    return origins


def create_app() -> FastAPI:
    app = FastAPI(title="OPSYNCA AI API")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=_parse_origins(os.getenv("CORS_ALLOW_ORIGINS", _DEFAULT_ORIGINS)),
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(rag_router)

    @app.get("/")
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    return app


app = create_app()

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
    # En production: pas de Swagger /docs, /redoc ni de schema OpenAPI public,
    # pour qu'un visiteur ne puisse pas executer le backend depuis l'UI /docs.
    is_production = os.getenv("ENVIRONMENT", "").strip().lower() == "production"
    docs_kwargs = (
        {"docs_url": None, "redoc_url": None, "openapi_url": None} if is_production else {}
    )
    app = FastAPI(title="OPSYNCA AI API", **docs_kwargs)
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

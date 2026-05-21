import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.rag.router import router as rag_router

_DEFAULT_ORIGINS = "*"


def _parse_origins(raw: str) -> list[str]:
    return [item.strip() for item in raw.split(",") if item.strip()]


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

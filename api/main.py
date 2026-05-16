from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from api.rag.router import router as rag_router

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"

app = FastAPI(title="Portfolio RAG API")
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
app.include_router(rag_router)


@app.get("/")
async def rag_app() -> FileResponse:
    return FileResponse(STATIC_DIR / "index.html")

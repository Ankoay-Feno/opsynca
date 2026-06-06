FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    PATH="/app/.venv/bin:$PATH"

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        libatomic1 \
        tesseract-ocr \
        tesseract-ocr-eng \
        tesseract-ocr-fra \
    && rm -rf /var/lib/apt/lists/*

    
COPY pyproject.toml uv.lock .python-version README.md ./
# --extra local-embed : embeddings 100% locaux (fastembed), jamais Gemini.
RUN uv sync --frozen --no-dev --extra local-embed

# Bake le modele d'embedding dans l'image (sinon il se re-telechargerait a chaque
# cold start scale-to-zero). Sert a la fois la precompute KB et les requetes runtime.
# Le modele est PRE-TELECHARGE dans le runner CI (etape "Pre-download embedding
# model") puis copie ici : on evite tout acces reseau HF pendant `docker build`,
# qui est rate-limite/bloque en anonyme sur les IP GitHub Actions.
ENV EMBEDDING_BACKEND=local \
    FASTEMBED_CACHE_DIR=/app/.fastembed_cache \
    LOCAL_EMBEDDING_MODEL=sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2
COPY .fastembed_cache /app/.fastembed_cache

COPY api ./api

EXPOSE 8000

CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]

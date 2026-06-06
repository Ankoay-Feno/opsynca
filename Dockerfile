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
ENV EMBEDDING_BACKEND=local \
    FASTEMBED_CACHE_DIR=/app/.fastembed_cache \
    LOCAL_EMBEDDING_MODEL=sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2
RUN python -c "from fastembed import TextEmbedding; TextEmbedding(model_name='${LOCAL_EMBEDDING_MODEL}', cache_dir='${FASTEMBED_CACHE_DIR}')"

COPY api ./api

EXPOSE 8000

CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]

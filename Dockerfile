FROM node:20-bookworm-slim AS frontend-builder

WORKDIR /frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/index.html frontend/tsconfig*.json frontend/vite.config.ts ./
COPY frontend/src ./src
RUN npm run build

FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    PRISMA_HOME_DIR=/app \
    PRISMA_NODEENV_CACHE_DIR=/app/.cache/prisma-python/nodeenv \
    NPM_CONFIG_CACHE=/tmp/.npm \
    PATH="/app/.venv/bin:$PATH"

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        libatomic1 \
        tesseract-ocr \
        tesseract-ocr-eng \
        tesseract-ocr-fra \
    && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml uv.lock .python-version README.md ./
RUN uv sync --frozen --no-dev
RUN DATABASE_URL=postgresql://litellm:litellm_password@localhost:5432/litellm \
    prisma generate --schema /app/.venv/lib/python3.12/site-packages/litellm/proxy/schema.prisma

COPY api ./api
COPY --from=frontend-builder /frontend/dist ./api/static
COPY litellm_config.yaml ./

EXPOSE 4000 8000

CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]

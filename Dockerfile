FROM node:20-bookworm-slim AS frontend-builder

WORKDIR /frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm config set fetch-retries 5 \
    && npm config set fetch-retry-mintimeout 20000 \
    && npm config set fetch-retry-maxtimeout 120000 \
    && npm config set fetch-timeout 600000
RUN --mount=type=cache,target=/root/.npm \
    npm ci --prefer-offline --no-audit --no-fund

COPY frontend/index.html frontend/tsconfig*.json frontend/vite.config.ts ./
COPY frontend/src ./src
RUN npm run build

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
RUN uv sync --frozen --no-dev

COPY api ./api
COPY --from=frontend-builder /frontend/dist ./api/static

EXPOSE 8000

CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]

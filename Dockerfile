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
    && apt-get install -y --no-install-recommends libatomic1 \
    && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml uv.lock .python-version README.md ./
RUN uv sync --frozen --no-dev
RUN DATABASE_URL=postgresql://litellm:litellm_password@localhost:5432/litellm \
    prisma generate --schema /app/.venv/lib/python3.12/site-packages/litellm/proxy/schema.prisma

COPY litellm_config.yaml ./

EXPOSE 4000

ENTRYPOINT ["litellm"]
CMD ["--config", "/app/litellm_config.yaml", "--host", "0.0.0.0", "--port", "4000"]

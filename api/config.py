import os
from dataclasses import dataclass
from functools import lru_cache


@dataclass(frozen=True)
class Settings:
    litellm_proxy_url: str
    litellm_master_key: str | None
    litellm_model: str
    embedding_model: str
    embedding_dimension: int
    qdrant_url: str
    qdrant_collection: str


@lru_cache
def get_settings() -> Settings:
    embedding_dimension = int(os.getenv("EMBEDDING_DIMENSION", "3072"))
    return Settings(
        litellm_proxy_url=os.getenv("LITELLM_PROXY_URL", "http://localhost:4000").rstrip("/"),
        litellm_master_key=os.getenv("LITELLM_MASTER_KEY"),
        litellm_model=os.getenv("LITELLM_MODEL", "gemini/gemini-2.5-flash-lite"),
        embedding_model=os.getenv("LITELLM_EMBEDDING_MODEL", "gemini/gemini-embedding-001"),
        embedding_dimension=embedding_dimension,
        qdrant_url=os.getenv("QDRANT_URL", "http://localhost:6333").rstrip("/"),
        qdrant_collection=os.getenv("QDRANT_COLLECTION", f"portfolio_documents_{embedding_dimension}"),
    )

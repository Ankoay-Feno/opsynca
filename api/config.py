import os
from dataclasses import dataclass
from functools import lru_cache


@dataclass(frozen=True)
class Settings:
    litellm_model: str
    embedding_model: str


@lru_cache
def get_settings() -> Settings:
    return Settings(
        litellm_model=os.getenv("LITELLM_MODEL", "gemini/gemini-2.5-flash-lite"),
        embedding_model=os.getenv("LITELLM_EMBEDDING_MODEL", "gemini/gemini-embedding-001"),
    )

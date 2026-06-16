import os
from dataclasses import dataclass
from functools import lru_cache


@dataclass(frozen=True)
class Settings:
    litellm_model: str
    embedding_model: str
    # "local" => fastembed (defaut, aucun quota), "cloud" => Gemini via LiteLLM.
    # L'embedding (KB precalculee au build + requetes au runtime) est TOUJOURS
    # local : Gemini/groq/mistral ne servent QUE le chat (/api/answer).
    # Changer de backend impose une re-indexation (dimensions differentes).
    embedding_backend: str = "local"
    local_embedding_model: str = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
    embedding_cache_dir: str | None = None
    # Agregateur d'emplois — source Careerjet (Madagascar via locale fr_MG).
    # Cle obtenue depuis un compte editeur Careerjet (gratuit). Si absente, le
    # connecteur Careerjet est simplement ignore (les sources remote restent OK).
    careerjet_api_key: str | None = None
    careerjet_locale: str = "fr_MG"
    # Careerjet exige un header Referer (sinon 403). Doit idealement correspondre
    # au site editeur declare dans le compte Careerjet.
    careerjet_referer: str = "https://thenextmind.ai"


@lru_cache
def get_settings() -> Settings:
    return Settings(
        litellm_model=os.getenv("LITELLM_MODEL", "gemini/gemini-2.5-flash-lite"),
        embedding_model=os.getenv("LITELLM_EMBEDDING_MODEL", "gemini/gemini-embedding-001"),
        embedding_backend=os.getenv("EMBEDDING_BACKEND", "local").lower(),
        local_embedding_model=os.getenv(
            "LOCAL_EMBEDDING_MODEL",
            "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
        ),
        embedding_cache_dir=os.getenv("FASTEMBED_CACHE_DIR") or None,
        careerjet_api_key=os.getenv("CAREERJET_API_KEY") or None,
        careerjet_locale=os.getenv("CAREERJET_LOCALE", "fr_MG"),
        careerjet_referer=os.getenv("CAREERJET_REFERER", "https://thenextmind.ai"),
    )

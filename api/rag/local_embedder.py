from __future__ import annotations

from functools import lru_cache
from typing import Any


@lru_cache(maxsize=2)
def _load_model(model_name: str, cache_dir: str | None) -> Any:
    # Import paresseux : fastembed (+ onnxruntime) n'est charge qu'au premier
    # embedding local, pour ne pas ralentir le boot quand backend == "cloud".
    # lru_cache garde le modele en memoire entre les requetes (le chargement
    # coute plusieurs centaines de Mo et ~1-2 s, a ne payer qu'une fois).
    try:
        from fastembed import TextEmbedding
    except ImportError as exc:  # extra non installe
        raise RuntimeError(
            "EMBEDDING_BACKEND=local requiert l'extra fastembed : "
            "`uv sync --extra local-embed`."
        ) from exc

    return TextEmbedding(model_name=model_name, cache_dir=cache_dir)


def embed_local(model_name: str, texts: list[str], cache_dir: str | None = None) -> list[list[float]]:
    model = _load_model(model_name, cache_dir)
    # fastembed renvoie un generateur de np.ndarray ; .tolist() => JSON-serialisable.
    return [vector.tolist() for vector in model.embed(list(texts))]

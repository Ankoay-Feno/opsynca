from __future__ import annotations

import math

from api.jobs.schemas import Job
from api.litellm_client import LiteLLMClient


async def score_and_rank(profile_text: str, jobs: list[Job], *, litellm: LiteLLMClient) -> list[Job]:
    """Calcule un % de match (cosinus profil vs offre) et trie par pertinence.

    `profile_text` = le ROLE cible (metier + mots-cles), pas le CV brut : on
    compare le role au TITRE de chaque offre (qui EST le role). Comparer les
    descriptions completes ou le CV entier injecte du bruit et fausse le tri.
    """
    if not jobs:
        return jobs

    texts = [profile_text.strip()]
    texts.extend(_job_text(job) for job in jobs)

    vectors = await litellm.embed(texts)
    if len(vectors) != len(texts):
        return jobs  # embedding incomplet : on renvoie sans score plutot que de planter

    profile_vec = vectors[0]
    raw = [_cosine(profile_vec, vectors[index + 1]) for index in range(len(jobs))]
    scores = _normalize(raw)

    scored = [job.model_copy(update={"match": score}) for job, score in zip(jobs, scores)]
    scored.sort(key=lambda job: job.match or 0, reverse=True)
    return scored


def _job_text(job: Job) -> str:
    # Le TITRE seul porte le role. La description ajoute du bruit (boilerplate,
    # langue) qui faussait le classement — on l'exclut volontairement.
    return job.titre


def _cosine(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(y * y for y in b))
    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0
    return dot / (norm_a * norm_b)


def _normalize(raw: list[float]) -> list[int]:
    # Min-max sur le lot : la meilleure offre = 100%, la pire = 0%. Les valeurs
    # de cosinus se tassent (~0,3-0,7) ; sans cette calibration tout serait ~50%.
    low = min(raw)
    high = max(raw)
    if high - low < 1e-9:
        return [100 for _ in raw]
    return [round((value - low) / (high - low) * 100) for value in raw]

from __future__ import annotations

from typing import Any

import httpx

from api.jobs.schemas import Job

SOURCE = "jobicy"

# API publique, sans cle. Jobicy demande de rester raisonnable (~quelques
# appels/jour) : le cache cote agregateur s'en chargera plus tard.
_API_URL = "https://jobicy.com/api/v2/remote-jobs"
_TIMEOUT = 20.0


async def fetch(keywords: str | None = None, *, count: int = 50) -> list[Job]:
    """Interroge Jobicy et renvoie des offres deja normalisees en `Job`."""
    params: dict[str, Any] = {"count": count}
    if keywords:
        params["tag"] = keywords

    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        response = await client.get(_API_URL, params=params)
        response.raise_for_status()
        payload = response.json()

    jobs: list[Job] = []
    for item in payload.get("jobs", []):
        if isinstance(item, dict):
            job = _to_job(item)
            if job is not None:
                jobs.append(job)
    return jobs


def _to_job(item: dict[str, Any]) -> Job | None:
    # Sans titre ou sans lien, l'offre est inexploitable cote UI : on l'ignore.
    titre = (item.get("jobTitle") or "").strip()
    lien = (item.get("url") or "").strip()
    if not titre or not lien:
        return None
    return Job(
        titre=titre,
        entreprise=item.get("companyName") or None,
        lieu=item.get("jobGeo") or None,
        remote=True,
        source=SOURCE,
        lien=lien,
        description=item.get("jobExcerpt") or None,
    )

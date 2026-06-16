from __future__ import annotations

from typing import Any

import httpx

from api.jobs.schemas import Job
from api.jobs.text_match import matches_any

SOURCE = "remoteok"

# API publique sans cle (remote tech). CGU : lien retour + mention obligatoires
# (on garde l'URL RemoteOK telle quelle). Flux d'offres : filtrage local.
_API_URL = "https://remoteok.com/api"
_TIMEOUT = 20.0
_HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; portfolio-jobs/1.0)"}


async def fetch(keywords: list[str]) -> list[Job]:
    async with httpx.AsyncClient(timeout=_TIMEOUT, headers=_HEADERS) as client:
        response = await client.get(_API_URL)
        response.raise_for_status()
        payload = response.json()

    jobs: list[Job] = []
    for item in payload if isinstance(payload, list) else []:
        # Le 1er element est une mention legale (pas d'offre) : on l'ignore.
        if isinstance(item, dict) and item.get("position"):
            job = _to_job(item, keywords)
            if job is not None:
                jobs.append(job)
    return jobs


def _to_job(item: dict[str, Any], keywords: list[str]) -> Job | None:
    titre = (item.get("position") or "").strip()
    slug = (item.get("slug") or "").strip()
    lien = (item.get("apply_url") or item.get("url") or "").strip()
    if not lien and slug:
        lien = f"https://remoteok.com/remote-jobs/{slug}"
    if not titre or not lien:
        return None

    tags = " ".join(item.get("tags") or [])
    haystack = f"{titre} {item.get('company', '')} {tags}"
    if not matches_any(haystack, keywords):
        return None

    return Job(
        titre=titre,
        entreprise=item.get("company") or None,
        lieu=item.get("location") or "Remote",
        remote=True,
        source=SOURCE,
        lien=lien,
        description=item.get("description") or None,
    )

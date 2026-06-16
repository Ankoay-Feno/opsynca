from __future__ import annotations

from typing import Any

import httpx

from api.jobs.schemas import Job
from api.jobs.text_match import matches_any

SOURCE = "arbeitnow"

# API publique sans cle (Europe + remote). Flux d'offres : filtrage local.
_API_URL = "https://www.arbeitnow.com/api/job-board-api"
_TIMEOUT = 20.0


async def fetch(keywords: list[str]) -> list[Job]:
    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        response = await client.get(_API_URL)
        response.raise_for_status()
        payload = response.json()

    jobs: list[Job] = []
    for item in payload.get("data", []):
        if isinstance(item, dict):
            job = _to_job(item, keywords)
            if job is not None:
                jobs.append(job)
    return jobs


def _to_job(item: dict[str, Any], keywords: list[str]) -> Job | None:
    # Arbeitnow melange remote et presentiel : on n'utilise cette source que
    # pour le remote, donc on ignore les offres sur site.
    if not item.get("remote"):
        return None

    titre = (item.get("title") or "").strip()
    lien = (item.get("url") or "").strip()
    if not titre or not lien:
        return None

    tags = " ".join(item.get("tags") or [])
    haystack = f"{titre} {item.get('company_name', '')} {tags}"
    if not matches_any(haystack, keywords):
        return None

    return Job(
        titre=titre,
        entreprise=item.get("company_name") or None,
        lieu=item.get("location") or "Remote",
        remote=True,
        source=SOURCE,
        lien=lien,
        description=item.get("description") or None,
    )

from __future__ import annotations

from typing import Any

import httpx

from api.jobs.schemas import Job
from api.jobs.text_match import matches_any

SOURCE = "himalayas"

# API publique sans cle. Renvoie un flux d'offres remote recentes (pas de
# filtrage serveur) : on filtre localement par mot-cle.
_API_URL = "https://himalayas.app/jobs/api"
_TIMEOUT = 20.0
_LIMIT = 100


async def fetch(keywords: list[str]) -> list[Job]:
    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        response = await client.get(_API_URL, params={"limit": _LIMIT})
        response.raise_for_status()
        payload = response.json()

    jobs: list[Job] = []
    for item in payload.get("jobs", []):
        if isinstance(item, dict):
            job = _to_job(item, keywords)
            if job is not None:
                jobs.append(job)
    return jobs


def _to_job(item: dict[str, Any], keywords: list[str]) -> Job | None:
    titre = (item.get("title") or "").strip()
    lien = (item.get("applicationLink") or item.get("guid") or "").strip()
    if not titre or not lien:
        return None

    categories = " ".join(item.get("categories") or [])
    haystack = f"{titre} {item.get('companyName', '')} {item.get('excerpt', '')} {categories}"
    if not matches_any(haystack, keywords):
        return None

    locations = item.get("locationRestrictions") or []
    lieu = ", ".join(loc for loc in locations if isinstance(loc, str)) or "Remote"
    return Job(
        titre=titre,
        entreprise=item.get("companyName") or None,
        lieu=lieu,
        remote=True,
        source=SOURCE,
        lien=lien,
        description=item.get("excerpt") or None,
    )

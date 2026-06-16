from __future__ import annotations

from datetime import datetime
from email.utils import parsedate_to_datetime
from typing import Any

import httpx

from api.jobs.schemas import Job

SOURCE = "careerjet"

_API_URL = "https://search.api.careerjet.net/v4/query"
_TIMEOUT = 20.0
_MAX_PAGE_SIZE = 100


async def fetch(
    keywords: str | None,
    *,
    api_key: str,
    locale: str,
    user_ip: str,
    user_agent: str,
    referer: str,
    location: str | None = None,
    page_size: int = 50,
) -> list[Job]:
    """Interroge l'API Careerjet (Madagascar via locale `fr_MG`).

    Contraintes de l'API (sinon 403) :
    - `user_ip` + `user_agent` (ceux du visiteur final) obligatoires ;
    - un header `Referer` doit etre present ;
    - l'IP source du serveur doit etre autorisee dans le compte editeur.
    """
    params: dict[str, Any] = {
        "locale_code": locale,
        "page_size": max(1, min(page_size, _MAX_PAGE_SIZE)),
        "sort": "date",
        "user_ip": user_ip,
        "user_agent": user_agent,
    }
    if keywords:
        params["keywords"] = keywords
    if location:
        params["location"] = location

    # Auth Basic : username = cle API, password = vide. httpx encode en base64.
    auth = httpx.BasicAuth(api_key, "")
    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        response = await client.get(
            _API_URL, params=params, auth=auth, headers={"Referer": referer}
        )
        response.raise_for_status()
        payload = response.json()

    # "JOBS" => offres. "LOCATIONS" => localite ambigue ou introuvable : pas
    # d'offres a renvoyer, on retourne une liste vide plutot que de planter.
    if payload.get("type") != "JOBS":
        return []

    jobs: list[Job] = []
    for item in payload.get("jobs", []):
        if isinstance(item, dict):
            job = _to_job(item)
            if job is not None:
                jobs.append(job)
    return jobs


def _to_job(item: dict[str, Any]) -> Job | None:
    titre = (item.get("title") or "").strip()
    # `url` est un lien de tracking jobviewtrack.com qui redirige vers l'offre.
    lien = (item.get("url") or "").strip()
    if not titre or not lien:
        return None
    return Job(
        titre=titre,
        entreprise=(item.get("company") or "").strip() or None,
        lieu=(item.get("locations") or "").strip() or None,
        remote=False,
        source=SOURCE,
        lien=lien,
        date=_parse_date(item.get("date")),
        description=(item.get("description") or "").strip() or None,
    )


def _parse_date(raw: Any) -> datetime | None:
    # Format Careerjet : "Wed,15 Nov 2025 19:13:43 GMT" (RFC 2822).
    if not isinstance(raw, str) or not raw.strip():
        return None
    try:
        return parsedate_to_datetime(raw)
    except (TypeError, ValueError):
        return None

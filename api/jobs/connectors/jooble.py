from __future__ import annotations

import re
from typing import Any

import httpx

from api.jobs.schemas import Job

SOURCE = "jooble"

# Meta-moteur mondial (couvre Madagascar). Cle gratuite (compte sur jooble.org).
# Endpoint POST : https://jooble.org/api/{cle} avec un body JSON {keywords, location}.
_API_BASE = "https://fr.jooble.org/api"
_TIMEOUT = 20.0

_HTML_TAG = re.compile(r"<[^>]+>")


async def fetch(
    keyword: str | None,
    *,
    api_key: str,
    location: str | None = None,
    remote: bool = False,
) -> list[Job]:
    body: dict[str, Any] = {"keywords": keyword or ""}
    if location:
        body["location"] = location

    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        response = await client.post(f"{_API_BASE}/{api_key}", json=body)
        response.raise_for_status()
        payload = response.json()

    jobs: list[Job] = []
    for item in payload.get("jobs", []):
        if isinstance(item, dict):
            job = _to_job(item, remote)
            if job is not None:
                jobs.append(job)
    return jobs


def _to_job(item: dict[str, Any], remote: bool) -> Job | None:
    titre = (item.get("title") or "").strip()
    lien = (item.get("link") or "").strip()
    if not titre or not lien:
        return None
    return Job(
        titre=titre,
        entreprise=(item.get("company") or "").strip() or None,
        lieu=(item.get("location") or "").strip() or None,
        remote=remote,
        source=SOURCE,
        lien=lien,
        description=_strip_html(item.get("snippet")),
    )


def _strip_html(snippet: Any) -> str | None:
    if not isinstance(snippet, str) or not snippet.strip():
        return None
    return _HTML_TAG.sub(" ", snippet).strip() or None

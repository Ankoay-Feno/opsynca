from __future__ import annotations

import asyncio
import re
from typing import Any

import httpx

from api.jobs.schemas import Job
from api.jobs.text_match import matches_any

SOURCE = "themuse"

# API publique sans cle (mondial, generaliste). On ne garde que le remote
# (location "Flexible / Remote") puis on filtre localement par mot-cle.
_API_URL = "https://www.themuse.com/api/public/jobs"
_TIMEOUT = 20.0
_PAGES = 2  # ~20 offres/page

_HTML_TAG = re.compile(r"<[^>]+>")


async def fetch(keywords: list[str]) -> list[Job]:
    pages = await asyncio.gather(
        *(_fetch_page(page) for page in range(1, _PAGES + 1)),
        return_exceptions=True,
    )
    jobs: list[Job] = []
    for page in pages:
        if isinstance(page, BaseException):
            continue
        for item in page:
            job = _to_job(item, keywords)
            if job is not None:
                jobs.append(job)
    return jobs


async def _fetch_page(page: int) -> list[dict[str, Any]]:
    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        response = await client.get(
            _API_URL, params={"page": page, "location": "Flexible / Remote"}
        )
        response.raise_for_status()
        return response.json().get("results", [])


def _to_job(item: dict[str, Any], keywords: list[str]) -> Job | None:
    titre = (item.get("name") or "").strip()
    lien = ((item.get("refs") or {}).get("landing_page") or "").strip()
    if not titre or not lien:
        return None

    company = (item.get("company") or {}).get("name") or ""
    categories = " ".join(cat.get("name", "") for cat in item.get("categories") or [])
    if not matches_any(f"{titre} {company} {categories}", keywords):
        return None

    return Job(
        titre=titre,
        entreprise=company or None,
        lieu="Remote",
        remote=True,
        source=SOURCE,
        lien=lien,
        description=_strip_html(item.get("contents")),
    )


def _strip_html(contents: Any) -> str | None:
    if not isinstance(contents, str) or not contents.strip():
        return None
    text = _HTML_TAG.sub(" ", contents)
    text = re.sub(r"\s+", " ", text).strip()
    return text[:400] or None

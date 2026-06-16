from __future__ import annotations

import asyncio
from typing import Any

from api.config import Settings
from api.jobs.connectors import careerjet, jobicy
from api.jobs.schemas import Job


async def search(
    keywords: list[str | None],
    *,
    settings: Settings,
    madagascar: bool,
    remote: bool,
    user_ip: str,
    user_agent: str,
) -> list[Job]:
    """Lance une recherche par mot-cle (en parallele) puis fusionne et dedup.

    `keywords` peut contenir `None` (recherche large sans mot-cle). Chaque
    mot-cle interroge toutes les sources actives ; tout est ensuite fusionne.
    """
    per_keyword = await asyncio.gather(
        *(
            _fetch_one(
                keyword,
                settings=settings,
                madagascar=madagascar,
                remote=remote,
                user_ip=user_ip,
                user_agent=user_agent,
            )
            for keyword in keywords
        ),
        return_exceptions=True,
    )
    jobs: list[Job] = []
    for result in per_keyword:
        if not isinstance(result, BaseException):
            jobs.extend(result)
    return _dedup(jobs)


async def _fetch_one(
    keyword: str | None,
    *,
    settings: Settings,
    madagascar: bool,
    remote: bool,
    user_ip: str,
    user_agent: str,
) -> list[Job]:
    tasks: list[Any] = []
    if remote:
        tasks.append(jobicy.fetch(keyword))
    # Careerjet n'est interroge que si une cle est configuree.
    if madagascar and settings.careerjet_api_key:
        tasks.append(
            careerjet.fetch(
                keyword,
                api_key=settings.careerjet_api_key,
                locale=settings.careerjet_locale,
                user_ip=user_ip,
                user_agent=user_agent,
                referer=settings.careerjet_referer,
            )
        )

    # return_exceptions=True : une source en panne ne casse pas l'agregat.
    results = await asyncio.gather(*tasks, return_exceptions=True)
    jobs: list[Job] = []
    for result in results:
        if not isinstance(result, BaseException):
            jobs.extend(result)
    return jobs


def _dedup(jobs: list[Job]) -> list[Job]:
    seen: set[tuple[str, str]] = set()
    unique: list[Job] = []
    for job in jobs:
        key = (job.titre.strip().lower(), (job.entreprise or "").strip().lower())
        if key in seen:
            continue
        seen.add(key)
        unique.append(job)
    return unique

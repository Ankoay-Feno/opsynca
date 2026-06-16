from __future__ import annotations

import asyncio
from typing import Awaitable

from api.config import Settings
from api.jobs.connectors import (
    arbeitnow,
    careerjet,
    himalayas,
    jobicy,
    jooble,
    remoteok,
    themuse,
)
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
    """Interroge toutes les sources actives en parallele, fusionne et dedup.

    Deux familles de sources :
    - "searchable" (Jobicy, Careerjet) : un appel PAR mot-cle ;
    - "flux" (Himalayas, Arbeitnow, RemoteOK) : un SEUL appel, filtre localement
      sur l'ensemble des mots-cles (ces API ne filtrent pas cote serveur).
    """
    feed_keywords = [keyword for keyword in keywords if keyword]
    tasks: list[Awaitable[list[Job]]] = []

    for keyword in keywords:
        if remote:
            tasks.append(jobicy.fetch(keyword))
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
        # Jooble (n'a pas de region Madagascar) : on le cible sur le remote
        # francophone (location "Télétravail" sur une cle FR). Ignore sans cle.
        if remote and settings.jooble_api_key:
            tasks.append(
                jooble.fetch(
                    keyword,
                    api_key=settings.jooble_api_key,
                    location=settings.jooble_location,
                    remote=True,
                )
            )

    if remote:
        tasks.append(himalayas.fetch(feed_keywords))
        tasks.append(arbeitnow.fetch(feed_keywords))
        tasks.append(remoteok.fetch(feed_keywords))
        tasks.append(themuse.fetch(feed_keywords))

    # return_exceptions=True : une source en panne ne casse pas l'agregat.
    results = await asyncio.gather(*tasks, return_exceptions=True)
    jobs: list[Job] = []
    for result in results:
        if not isinstance(result, BaseException):
            jobs.extend(result)
    return _dedup(jobs)


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

from __future__ import annotations

import hashlib
from datetime import datetime

from pydantic import BaseModel, Field, model_validator


class Job(BaseModel):
    """Format unifie d'une offre, commun a toutes les sources.

    Chaque connecteur mappe sa reponse brute (champs `url`, `slug`,
    `applicationLink`...) vers ce contrat. Le reste du systeme ne manipule
    que des `Job`, jamais le JSON specifique d'une source.
    """

    # Identifiant STABLE base sur le contenu (source+titre+entreprise), pas sur
    # le lien : le lien Careerjet (tracking) change a chaque recherche. C'est cet
    # id qui sert au marquage "deja postule" cote client.
    id: str = ""
    titre: str = Field(..., min_length=1)
    entreprise: str | None = None
    lieu: str | None = None
    remote: bool = False
    source: str = Field(..., min_length=1)
    lien: str = Field(..., min_length=1)
    date: datetime | None = None
    description: str | None = None
    # Score de pertinence vs le CV (0-100), renseigne uniquement pour la
    # recherche par CV. None pour une recherche par mot-cle.
    match: int | None = None

    @model_validator(mode="after")
    def _ensure_id(self) -> "Job":
        if not self.id:
            signature = f"{self.source}|{self.titre.strip().lower()}|{(self.entreprise or '').strip().lower()}"
            self.id = hashlib.sha1(signature.encode("utf-8")).hexdigest()[:16]
        return self


class JobSearchResponse(BaseModel):
    count: int
    jobs: list[Job] = Field(default_factory=list)


class CvProfile(BaseModel):
    """Profil metier extrait d'un CV par le LLM (tout secteur)."""

    metier: str | None = None
    mots_cles: list[str] = Field(default_factory=list)


class CvJobSearchResponse(BaseModel):
    metier: str | None = None
    mots_cles: list[str] = Field(default_factory=list)
    count: int
    jobs: list[Job] = Field(default_factory=list)

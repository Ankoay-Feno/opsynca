from __future__ import annotations

from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, UploadFile

from api.config import Settings, get_settings
from api.jobs import aggregate, cv_keywords, matching
from api.jobs.schemas import CvJobSearchResponse, CvProfile, JobSearchResponse
from api.litellm_client import LiteLLMClient
from api.rag.extract_file_contents import FileContentExtractor

router = APIRouter(tags=["jobs"], prefix="/api/jobs")


@router.get("", response_model=JobSearchResponse)
async def search_jobs(
    request: Request,
    q: str | None = Query(default=None, description="Mot-cle de recherche"),
    madagascar: bool = Query(default=True, description="Inclure Madagascar (Careerjet)"),
    remote: bool = Query(default=True, description="Inclure les offres remote"),
    settings: Settings = Depends(get_settings),
) -> JobSearchResponse:
    jobs = await aggregate.search(
        [q],
        settings=settings,
        madagascar=madagascar,
        remote=remote,
        user_ip=_client_ip(request),
        user_agent=request.headers.get("user-agent", "Mozilla/5.0"),
    )
    return JobSearchResponse(count=len(jobs), jobs=jobs)


@router.post("/from-cv", response_model=CvJobSearchResponse)
async def search_jobs_from_cv(
    request: Request,
    file: UploadFile = File(...),
    madagascar: bool = Query(default=True, description="Inclure Madagascar (Careerjet)"),
    remote: bool = Query(default=True, description="Inclure les offres remote"),
    settings: Settings = Depends(get_settings),
) -> CvJobSearchResponse:
    try:
        extracted = await FileContentExtractor.extract_file_contents(file)
    finally:
        await file.close()

    text = extracted["text"]
    if not text.strip():
        raise HTTPException(status_code=400, detail="Aucun contenu textuel exploitable dans le CV.")

    litellm = LiteLLMClient(settings)
    profile = await cv_keywords.extract_keywords(text, litellm=litellm)
    if not profile.mots_cles:
        raise HTTPException(
            status_code=422,
            detail="Impossible d'extraire des mots-cles metier de ce CV.",
        )

    jobs = await aggregate.search(
        list(profile.mots_cles),
        settings=settings,
        madagascar=madagascar,
        remote=remote,
        user_ip=_client_ip(request),
        user_agent=request.headers.get("user-agent", "Mozilla/5.0"),
    )

    # Score de match : on compare le ROLE cible (metier + mots-cles) au titre des
    # offres, pas le CV brut (qui ajoute du bruit et fausse le classement).
    # En cas d'echec d'embedding, on degrade en renvoyant les offres non scorees.
    profile_text = " ".join(filter(None, [profile.metier, *profile.mots_cles]))
    try:
        jobs = await matching.score_and_rank(profile_text, jobs, litellm=litellm)
    except HTTPException:
        pass

    return CvJobSearchResponse(
        metier=profile.metier,
        mots_cles=profile.mots_cles,
        count=len(jobs),
        jobs=jobs,
    )


@router.post("/from-profile", response_model=CvJobSearchResponse)
async def search_jobs_from_profile(
    request: Request,
    payload: CvProfile,
    madagascar: bool = Query(default=True, description="Inclure Madagascar (Careerjet)"),
    remote: bool = Query(default=True, description="Inclure les offres remote"),
    settings: Settings = Depends(get_settings),
) -> CvJobSearchResponse:
    # Relance la recherche a partir d'un profil DEJA extrait (metier + mots-cles).
    # Pas de fichier ni d'appel LLM : on re-cherche et on re-score uniquement,
    # pour recuperer les nouvelles offres d'un CV deja traite.
    if not payload.mots_cles:
        raise HTTPException(status_code=422, detail="Aucun mot-cle fourni.")

    jobs = await aggregate.search(
        list(payload.mots_cles),
        settings=settings,
        madagascar=madagascar,
        remote=remote,
        user_ip=_client_ip(request),
        user_agent=request.headers.get("user-agent", "Mozilla/5.0"),
    )

    profile_text = " ".join(filter(None, [payload.metier, *payload.mots_cles]))
    try:
        jobs = await matching.score_and_rank(profile_text, jobs, litellm=LiteLLMClient(settings))
    except HTTPException:
        pass

    return CvJobSearchResponse(
        metier=payload.metier,
        mots_cles=payload.mots_cles,
        count=len(jobs),
        jobs=jobs,
    )


def _client_ip(request: Request) -> str:
    # Derriere un proxy (Azure Container Apps), l'IP reelle du visiteur est dans
    # X-Forwarded-For ; request.client.host serait l'IP du proxy.
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "0.0.0.0"

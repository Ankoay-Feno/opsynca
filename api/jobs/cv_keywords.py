from __future__ import annotations

import json
import re

from api.jobs.schemas import CvProfile
from api.litellm_client import LiteLLMClient

# On borne la taille envoyee au LLM : un CV tient largement dans ~6000 caracteres
# et ca evite des prompts/couts demesures sur un fichier anormalement long.
_MAX_CV_CHARS = 6000
_MAX_KEYWORDS = 6

_SYSTEM_PROMPT = (
    "Tu analyses un CV pour preparer une recherche d'emploi. Identifie le domaine "
    "professionnel de la personne, QUEL QUE SOIT le secteur (communication, finance, "
    "RH, commercial, BTP, sante, informatique, etc.) — ne suppose jamais que c'est un "
    "profil tech. Renvoie UNIQUEMENT un objet JSON valide, sans texte autour, au format :\n"
    '{"metier": "<intitule de poste principal>", "mots_cles": ["<mot-cle>", ...]}\n'
    "Regles pour les mots_cles (3 a 6) :\n"
    "- COURTS : 1 a 2 mots maximum, comme on les tape dans un moteur d'emploi "
    "(ex: 'devops', 'cloud', 'communication', 'comptable', 'marketing').\n"
    "- JAMAIS de phrases descriptives ('automatisation d'infrastructure', "
    "'gestion de projet senior') — elles ne renvoient aucune offre.\n"
    "- des intitules de poste ou domaines larges, en francais ou anglais usuel, "
    "sans doublon."
)


async def extract_keywords(cv_text: str, *, litellm: LiteLLMClient) -> CvProfile:
    """Demande au LLM les mots-cles metier d'un CV (tout secteur)."""
    excerpt = cv_text.strip()[:_MAX_CV_CHARS]
    messages = [
        {"role": "system", "content": _SYSTEM_PROMPT},
        {"role": "user", "content": f"CV:\n{excerpt}"},
    ]
    response = await litellm.chat(messages)
    raw = response["choices"][0]["message"].get("content", "") or ""
    return _parse_profile(raw)


def _parse_profile(raw: str) -> CvProfile:
    data = _extract_json(raw)
    metier = data.get("metier")
    keywords = data.get("mots_cles", [])

    cleaned: list[str] = []
    seen: set[str] = set()
    for item in keywords if isinstance(keywords, list) else []:
        if not isinstance(item, str):
            continue
        value = item.strip()
        marker = value.lower()
        if value and marker not in seen:
            seen.add(marker)
            cleaned.append(value)

    return CvProfile(
        metier=metier.strip() if isinstance(metier, str) and metier.strip() else None,
        mots_cles=cleaned[:_MAX_KEYWORDS],
    )


# Le LLM enrobe parfois le JSON dans des ``` ou du texte : on isole le 1er objet.
_JSON_OBJECT = re.compile(r"\{.*\}", re.DOTALL)


def _extract_json(raw: str) -> dict[str, object]:
    match = _JSON_OBJECT.search(raw)
    if not match:
        return {}
    try:
        parsed = json.loads(match.group(0))
    except json.JSONDecodeError:
        return {}
    return parsed if isinstance(parsed, dict) else {}

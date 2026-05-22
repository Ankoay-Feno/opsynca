from __future__ import annotations

import re
from typing import Any

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from api.config import Settings, get_settings
from api.litellm_client import LiteLLMClient
from api.rag.extract_file_contents import FileContentExtractor
from api.rag.schemas import (
    AnswerRequest,
    AnswerResponse,
    ContextChunk,
    EmbedRequest,
    EmbedResponse,
    ExtractResponse,
    HistoryMessage,
    TitleRequest,
    TitleResponse,
    WebSource,
)

router = APIRouter(tags=["rag"])


@router.post("/api/extract", response_model=ExtractResponse)
async def extract_file(file: UploadFile = File(...)) -> ExtractResponse:
    try:
        extracted = await FileContentExtractor.extract_file_contents(file)
        if not extracted["text"].strip():
            raise HTTPException(status_code=400, detail="Aucun contenu textuel exploitable.")
        return ExtractResponse(
            filename=extracted["filename"],
            content_type=extracted["content_type"],
            extension=extracted["extension"],
            text=extracted["text"],
            warnings=extracted["warnings"],
        )
    finally:
        await file.close()


@router.post("/api/embed", response_model=EmbedResponse)
async def embed_texts(
    payload: EmbedRequest,
    settings: Settings = Depends(get_settings),
) -> EmbedResponse:
    litellm = LiteLLMClient(settings)
    vectors = await litellm.embed(payload.texts)
    if len(vectors) != len(payload.texts):
        raise HTTPException(
            status_code=502,
            detail="Le nombre d'embeddings ne correspond pas aux textes envoyes.",
        )
    return EmbedResponse(embeddings=vectors)


@router.post("/api/answer", response_model=AnswerResponse)
async def answer(
    payload: AnswerRequest,
    settings: Settings = Depends(get_settings),
) -> AnswerResponse:
    litellm = LiteLLMClient(settings)
    tools = [{"googleSearch": {}}] if _supports_google_search(settings.litellm_model) else None
    messages = _build_messages(payload.message, payload.context, payload.history)
    try:
        response = await litellm.chat(messages, tools=tools)
    except HTTPException:
        # Gemini-native googleSearch tool est incompatible avec les fallbacks
        # Mistral/HuggingFace/Groq. Si l'appel echoue avec tools, on retente sans.
        if tools is None:
            raise
        response = await litellm.chat(messages, tools=None)

    raw = _extract_message_content(response)
    final_text, used_indices = _parse_answer(raw, len(payload.context))
    return AnswerResponse(
        answer=final_text,
        used_context_indices=used_indices,
        web_sources=_extract_web_sources(response),
    )


def _extract_message_content(response: dict[str, Any]) -> str:
    for choice in response.get("choices") or []:
        if not isinstance(choice, dict):
            continue
        message = choice.get("message") if isinstance(choice.get("message"), dict) else None
        if message:
            content = message.get("content")
            if isinstance(content, str):
                return content
    return ""


@router.post("/api/title", response_model=TitleResponse)
async def generate_title(
    payload: TitleRequest,
    settings: Settings = Depends(get_settings),
) -> TitleResponse:
    litellm = LiteLLMClient(settings)
    transcript = "\n".join(
        f"{msg.role}: {msg.content.strip()}" for msg in payload.messages[:12] if msg.content.strip()
    )
    if not transcript:
        raise HTTPException(status_code=400, detail="Aucun contenu exploitable pour generer un titre.")

    messages = [
        {
            "role": "system",
            "content": (
                "Tu génères un titre court (3 à 6 mots, en français) qui résume cette conversation. "
                "Style direct et technique : noms d'outils, verbes d'action, zéro remplissage. "
                "Pas de formules creuses (« Discussion sur... », « Aide concernant... »). "
                "Réponds UNIQUEMENT le titre, sans guillemets, sans ponctuation finale, sans préfixe."
            ),
        },
        {"role": "user", "content": f"Conversation:\n{transcript}"},
    ]
    response = await litellm.chat(messages)
    raw = response["choices"][0]["message"].get("content", "") or ""
    title = raw.strip().strip("\"'").rstrip(".!?").strip()
    if not title:
        raise HTTPException(status_code=502, detail="Le modele n'a pas renvoye de titre.")
    return TitleResponse(title=title[:80])


def _supports_google_search(model: str) -> bool:
    return model.lower().startswith("gemini")


_SOURCES_LINE = re.compile(r"^\s*sources_utilisees\s*:\s*(.*)$", re.IGNORECASE)


def _parse_answer(raw: str, max_index: int) -> tuple[str, list[int]]:
    text = raw.rstrip()
    if not max_index or not text:
        return text.strip(), []

    lines = text.splitlines()
    for idx in range(len(lines) - 1, -1, -1):
        match = _SOURCES_LINE.match(lines[idx])
        if not match:
            continue
        indices = _extract_indices(match.group(1), max_index)
        cleaned = "\n".join(lines[:idx]).rstrip()
        return cleaned or text.strip(), indices

    return text.strip(), []


def _extract_indices(marker: str, max_index: int) -> list[int]:
    marker = marker.strip()
    if not marker or marker.lower() in {"aucune", "none", "-", "[]"}:
        return []
    indices: list[int] = []
    seen: set[int] = set()
    for token in re.split(r"[\s,;]+", marker.strip("[]")):
        try:
            value = int(token)
        except ValueError:
            continue
        if 1 <= value <= max_index and value not in seen:
            indices.append(value)
            seen.add(value)
    return indices


def _extract_web_sources(response: dict[str, Any]) -> list[WebSource]:
    metadata = _find_grounding_metadata(response)
    if not metadata:
        return []
    chunks = metadata.get("groundingChunks") or metadata.get("grounding_chunks") or []
    seen: set[str] = set()
    web_sources: list[WebSource] = []
    for chunk in chunks:
        if not isinstance(chunk, dict):
            continue
        web = chunk.get("web") if isinstance(chunk.get("web"), dict) else None
        if not web:
            continue
        uri = web.get("uri") or web.get("url")
        if not uri or uri in seen:
            continue
        seen.add(uri)
        web_sources.append(WebSource(uri=uri, title=web.get("title")))
    return web_sources


def _find_grounding_metadata(response: dict[str, Any]) -> dict[str, Any] | None:
    choices = response.get("choices") or []
    for choice in choices:
        if not isinstance(choice, dict):
            continue
        for key in ("groundingMetadata", "grounding_metadata"):
            value = choice.get(key)
            if isinstance(value, dict):
                return value
        message = choice.get("message") if isinstance(choice.get("message"), dict) else None
        if not message:
            continue
        for key in ("groundingMetadata", "grounding_metadata"):
            value = message.get(key)
            if isinstance(value, dict):
                return value
    for key in ("vertex_ai_grounding_metadata", "groundingMetadata", "grounding_metadata"):
        value = response.get(key)
        if isinstance(value, dict):
            return value
    return None


def _build_messages(
    question: str,
    context: list[ContextChunk],
    history: list[HistoryMessage],
) -> list[dict[str, str]]:
    base_system = (
        "Tu t'appelles OPSYNCA AI. Si on te demande ton nom ou ton identité, "
        "réponds toujours que tu es OPSYNCA AI (jamais un autre nom).\n\n"
        "PERSONA: tu réponds comme un ingénieur Cloud/DevOps senior — direct, concret, "
        "technique. Va droit au but, pas de phrases creuses (« Bonne question », « Bien sûr », "
        "« C'est un sujet intéressant »). Privilégie les commandes, snippets, noms d'outils "
        "exacts, versions, alternatives. Acronymes techniques utilisés tels quels (IAM, VPC, "
        "OIDC, IaC, MTTR...) sans définition redondante sauf si l'utilisateur le demande. "
        "Réponses courtes par défaut ; détaille seulement si la question l'exige. "
        "Pas de buzzwords (« solution clé en main », « expérience fluide », « état de l'art »). "
        "Quand pertinent : blocs de code annotés, exemples Terraform/YAML/CLI, et trade-offs "
        "explicites (coût, sécurité, opérabilité).\n\n"
        "LANGUE: tu réponds TOUJOURS et UNIQUEMENT en français, quelle que soit la langue "
        "de la question. Les termes techniques anglais restent en anglais (rolling-update, "
        "blue-green, observability, etc.).\n\n"
        "RECHERCHE WEB: tu as accès à l'outil de recherche Google. Tu DOIS l'appeler avant "
        "de répondre dès qu'une question porte sur :\n"
        "- une actualité, un événement récent, une date postérieure à ta date de connaissance,\n"
        "- une personne, entreprise, produit, version ou prix susceptibles d'avoir changé,\n"
        "- un fait vérifiable que tu ne connais pas avec certitude,\n"
        "- une question commençant par « aujourd'hui », « en ce moment », « dernier », "
        "« actuel », « nouveau », ou contenant une année >= 2024.\n\n"
        "Si tu hésites, recherche. Mieux vaut une recherche inutile qu'une réponse périmée. "
        "Cite explicitement les sources web utilisées dans le corps de ta réponse."
    )
    history_messages = [{"role": entry.role, "content": entry.content} for entry in history]

    if not context:
        return [
            {"role": "system", "content": base_system},
            *history_messages,
            {"role": "user", "content": question},
        ]

    context_block = "\n\n".join(
        f"[{index}] fichier={chunk.filename or 'inconnu'} chunk={chunk.chunk_index}\n{chunk.text}"
        for index, chunk in enumerate(context, start=1)
    )
    system_prompt = (
        f"{base_system}\n\n"
        "CONTEXTE INDEXÉ: un contexte numéroté ([1], [2], ...) t'est fourni comme connaissance "
        "OPTIONNELLE. Utilise-le seulement si la question y est réellement couverte. "
        "Sinon, ignore-le et réponds depuis tes connaissances ou la recherche web. "
        "Ne paraphrase pas le contexte pour gonfler la réponse — extrais l'info utile, point.\n\n"
        "FORMAT DE RÉPONSE OBLIGATOIRE:\n"
        "- écris ta réponse normalement\n"
        "- puis, sur la DERNIÈRE ligne uniquement, ajoute exactement: "
        "SOURCES_UTILISEES: <indices entiers des sources indexées utilisées séparés par des virgules, ou 'aucune'>"
    )
    return [
        {"role": "system", "content": system_prompt},
        *history_messages,
        {
            "role": "user",
            "content": f"Contexte indexe (optionnel):\n{context_block}\n\nQuestion:\n{question}",
        },
    ]

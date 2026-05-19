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
        # Mistral/HuggingFace/Groq. Si l'appel echoue avec tools, on retente sans
        # pour laisser la chaine de fallback repondre (sans recherche web).
        if tools is None:
            raise
        response = await litellm.chat(messages, tools=None)
    message = response["choices"][0]["message"]
    raw = message.get("content", "") or ""
    text, used_indices = _parse_answer(raw, len(payload.context))
    return AnswerResponse(
        answer=text,
        used_context_indices=used_indices,
        web_sources=_extract_web_sources(response),
    )


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
                "Tu generes un titre court (3 a 6 mots, en francais) qui resume cette conversation. "
                "Reponds avec UNIQUEMENT le titre, sans guillemets, sans ponctuation finale, sans prefixe."
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
        "Tu es un assistant utile avec acces a l'outil de recherche web Google. "
        "REGLE IMPERATIVE: tu DOIS appeler la recherche web Google avant de repondre "
        "des qu'une question porte sur:\n"
        "- une actualite, un evenement recent, une date posterieure a ta date de connaissance,\n"
        "- une personne, entreprise, produit ou prix susceptibles d'avoir change,\n"
        "- un fait verifiable que tu ne connais pas avec certitude,\n"
        "- une question commencant par 'aujourd'hui', 'en ce moment', 'dernier/derniere', "
        "'actuel', 'nouveau', ou contenant une annee >= 2024.\n\n"
        "Si tu hesites, recherche. Mieux vaut une recherche inutile qu'une reponse perimee. "
        "Cite explicitement les sources web utilisees dans le corps de ta reponse."
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
        "Un contexte indexe numerote ([1], [2], ...) t'est aussi fourni comme connaissance "
        "OPTIONNELLE. Utilise-le seulement si la question y est reellement couverte. "
        "Sinon, ignore-le et reponds depuis tes connaissances ou la recherche web.\n\n"
        "Format de reponse OBLIGATOIRE:\n"
        "- ecris ta reponse normalement\n"
        "- puis, sur la DERNIERE ligne uniquement, ajoute exactement: "
        "SOURCES_UTILISEES: <indices entiers des sources indexees utilisees separes par des virgules, ou 'aucune'>"
    )
    return [
        {"role": "system", "content": system_prompt},
        *history_messages,
        {
            "role": "user",
            "content": f"Contexte indexe (optionnel):\n{context_block}\n\nQuestion:\n{question}",
        },
    ]

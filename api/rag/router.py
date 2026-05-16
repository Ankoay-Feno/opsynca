from __future__ import annotations

import re
from typing import Any
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from api.config import Settings, get_settings
from api.litellm_client import LiteLLMClient
from api.rag.extract_file_contents import FileContentExtractor
from api.rag.processing import chunk_text, clean_for_indexing
from api.rag.qdrant_store import QdrantStore
from api.rag.schemas import (
    ChatRequest,
    ChatResponse,
    ChatSource,
    HistoryMessage,
    IndexResponse,
    IndexedDocument,
    WebSource,
)

router = APIRouter(tags=["rag"])


@router.post("/uploads", response_model=IndexResponse)
@router.post("/api/rag/upload", response_model=IndexResponse)
async def upload_and_index(
    file: UploadFile = File(...),
    settings: Settings = Depends(get_settings),
) -> IndexResponse:
    try:
        extracted = await FileContentExtractor.extract_file_contents(file)
        cleaned_content = clean_for_indexing(extracted["text"])
        chunks = chunk_text(cleaned_content)
        if not chunks:
            raise HTTPException(status_code=400, detail="Aucun contenu textuel exploitable a indexer.")

        litellm = LiteLLMClient(settings)
        embeddings = await litellm.embed([chunk.text for chunk in chunks])
        if len(embeddings) != len(chunks):
            raise HTTPException(status_code=502, detail="Le nombre d'embeddings ne correspond pas aux chunks.")
        _validate_embedding_dimensions(embeddings, settings)

        document_id = str(uuid4())
        points = [_build_point(document_id, extracted, chunk, vector) for chunk, vector in zip(chunks, embeddings)]
        await QdrantStore(settings).upsert_points(points)

        return IndexResponse(
            message="file indexed successfully",
            document_id=document_id,
            filename=extracted["filename"],
            content_type=extracted["content_type"],
            extension=extracted["extension"],
            chunks=len(chunks),
            cleaned_content=cleaned_content,
            warnings=extracted["warnings"],
        )
    finally:
        await file.close()


@router.get("/api/rag/documents", response_model=list[IndexedDocument])
async def list_documents(settings: Settings = Depends(get_settings)) -> list[dict[str, Any]]:
    return await QdrantStore(settings).list_documents()


@router.delete("/api/rag/documents/{document_id}")
async def delete_document(document_id: str, settings: Settings = Depends(get_settings)) -> dict[str, str]:
    await QdrantStore(settings).delete_document(document_id)
    return {"message": "document deindexed successfully", "document_id": document_id}


@router.post("/api/rag/chat", response_model=ChatResponse)
async def rag_chat(payload: ChatRequest, settings: Settings = Depends(get_settings)) -> ChatResponse:
    litellm = LiteLLMClient(settings)
    question_vector = (await litellm.embed([payload.message]))[0]
    _validate_embedding_dimensions([question_vector], settings)
    hits = await QdrantStore(settings).search(question_vector, limit=payload.top_k)
    sources = [_source_from_hit(hit) for hit in hits]

    tools = [{"googleSearch": {}}] if _supports_google_search(settings.litellm_model) else None
    response = await litellm.chat(
        _build_messages(payload.message, sources, payload.history),
        tools=tools,
    )
    message = response["choices"][0]["message"]
    raw = message.get("content", "") or ""
    answer, used_indices = _parse_answer(raw, len(sources))
    cited_sources = [sources[i - 1] for i in used_indices]
    web_sources = _extract_web_sources(response)
    return ChatResponse(answer=answer, sources=cited_sources, web_sources=web_sources)


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


def _build_point(document_id: str, extracted: dict[str, Any], chunk: Any, vector: list[float]) -> dict[str, Any]:
    return {
        "id": str(uuid4()),
        "vector": vector,
        "payload": {
            "document_id": document_id,
            "filename": extracted["filename"],
            "content_type": extracted["content_type"],
            "extension": extracted["extension"],
            "chunk_index": chunk.index,
            "text": chunk.text,
        },
    }


def _validate_embedding_dimensions(embeddings: list[list[float]], settings: Settings) -> None:
    dimensions = {len(embedding) for embedding in embeddings}
    if dimensions == {settings.embedding_dimension}:
        return

    raise HTTPException(
        status_code=502,
        detail={
            "message": "Embedding dimension mismatch.",
            "embedding_model": settings.embedding_model,
            "expected_dimension": settings.embedding_dimension,
            "actual_dimensions": sorted(dimensions),
            "fix": "Update EMBEDDING_DIMENSION to match the embedding model output, or choose a matching embedding model.",
        },
    )


def _source_from_hit(hit: dict[str, Any]) -> ChatSource:
    payload = hit.get("payload", {})
    return ChatSource(
        document_id=payload.get("document_id"),
        filename=payload.get("filename"),
        chunk_index=payload.get("chunk_index"),
        score=hit.get("score"),
        text=payload.get("text", ""),
    )


def _build_messages(
    question: str,
    sources: list[ChatSource],
    history: list[HistoryMessage],
) -> list[dict[str, str]]:
    base_system = (
        "Tu es un assistant utile. Tu peux utiliser la recherche web Google si la question "
        "necessite des informations recentes ou hors de tes connaissances. Cite les faits "
        "trouves en ligne dans ta reponse."
    )
    history_messages = [{"role": entry.role, "content": entry.content} for entry in history]

    if not sources:
        return [
            {"role": "system", "content": base_system},
            *history_messages,
            {"role": "user", "content": question},
        ]

    context = "\n\n".join(
        f"[{index}] fichier={source.filename} chunk={source.chunk_index}\n{source.text}"
        for index, source in enumerate(sources, start=1)
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
            "content": f"Contexte indexe (optionnel):\n{context}\n\nQuestion:\n{question}",
        },
    ]

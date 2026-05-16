from __future__ import annotations

from typing import Any

import httpx
from fastapi import HTTPException

from api.config import Settings


class QdrantStore:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.collection_url = f"{settings.qdrant_url}/collections/{settings.qdrant_collection}"

    async def ensure_collection(self) -> None:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.get(self.collection_url)
            if response.status_code == 200:
                self._validate_collection_dimension(response.json())
                return
            if response.status_code != 404:
                self._raise_qdrant_error(response)

            create_body = {
                "vectors": {
                    "size": self.settings.embedding_dimension,
                    "distance": "Cosine",
                }
            }
            response = await client.put(self.collection_url, json=create_body)
            self._raise_qdrant_error(response)

    async def upsert_points(self, points: list[dict[str, Any]]) -> None:
        if not points:
            return

        await self.ensure_collection()
        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.put(f"{self.collection_url}/points", params={"wait": "true"}, json={"points": points})
        self._raise_qdrant_error(response)

    async def search(self, vector: list[float], *, limit: int = 5) -> list[dict[str, Any]]:
        await self.ensure_collection()
        body = {"vector": vector, "limit": limit, "with_payload": True, "with_vector": False}

        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(f"{self.collection_url}/points/search", json=body)
        self._raise_qdrant_error(response)
        return response.json().get("result", [])

    async def delete_document(self, document_id: str) -> None:
        await self.ensure_collection()
        body = {"filter": {"must": [{"key": "document_id", "match": {"value": document_id}}]}}

        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(f"{self.collection_url}/points/delete", params={"wait": "true"}, json=body)
        self._raise_qdrant_error(response)

    async def list_documents(self) -> list[dict[str, Any]]:
        await self.ensure_collection()
        body = {"limit": 200, "with_payload": True, "with_vector": False}
        documents: dict[str, dict[str, Any]] = {}

        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(f"{self.collection_url}/points/scroll", json=body)
        self._raise_qdrant_error(response)

        for point in response.json().get("result", {}).get("points", []):
            payload = point.get("payload", {})
            document_id = payload.get("document_id")
            if not document_id:
                continue
            document = documents.setdefault(
                document_id,
                {
                    "document_id": document_id,
                    "filename": payload.get("filename"),
                    "content_type": payload.get("content_type"),
                    "chunks": 0,
                },
            )
            document["chunks"] += 1

        return sorted(documents.values(), key=lambda item: item.get("filename") or "")

    @staticmethod
    def _raise_qdrant_error(response: httpx.Response) -> None:
        if response.is_error:
            raise HTTPException(status_code=response.status_code, detail=response.text)

    def _validate_collection_dimension(self, collection: dict[str, Any]) -> None:
        vectors_config = (
            collection.get("result", {})
            .get("config", {})
            .get("params", {})
            .get("vectors")
        )
        current_dimension = self._vector_dimension(vectors_config)
        expected_dimension = self.settings.embedding_dimension

        if current_dimension is None or current_dimension == expected_dimension:
            return

        raise HTTPException(
            status_code=409,
            detail={
                "message": "Qdrant collection vector dimension mismatch.",
                "collection": self.settings.qdrant_collection,
                "embedding_model": self.settings.embedding_model,
                "expected_dimension": expected_dimension,
                "actual_dimension": current_dimension,
                "fix": (
                    "Delete/recreate the existing collection, set QDRANT_COLLECTION to a new collection name, "
                    "or set EMBEDDING_DIMENSION to match the embedding model already used by the collection."
                ),
            },
        )

    @staticmethod
    def _vector_dimension(vectors_config: Any) -> int | None:
        if not isinstance(vectors_config, dict):
            return None

        size = vectors_config.get("size")
        if isinstance(size, int):
            return size
        if isinstance(size, str) and size.isdigit():
            return int(size)

        named_vector_sizes: set[int] = set()
        for params in vectors_config.values():
            if not isinstance(params, dict):
                continue

            named_size = params.get("size")
            if isinstance(named_size, int):
                named_vector_sizes.add(named_size)
            elif isinstance(named_size, str) and named_size.isdigit():
                named_vector_sizes.add(int(named_size))

        if len(named_vector_sizes) == 1:
            return named_vector_sizes.pop()
        return None

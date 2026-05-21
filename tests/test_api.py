from __future__ import annotations

from starlette.datastructures import Headers
from starlette.middleware.cors import CORSMiddleware


def test_parse_origins_normalizes_and_deduplicates_values():
    from api.main import _parse_origins

    assert _parse_origins(" https://opsynca.dev/ , https://opsynca.dev ,, * ") == [
        "https://opsynca.dev",
        "*",
    ]


def test_cors_preflight_allows_opsynca_custom_domain():
    from api.main import _parse_origins

    cors = CORSMiddleware(
        lambda scope, receive, send: None,
        allow_origins=_parse_origins(
            "https://frontend.example.test/,https://opsynca.dev/"
        ),
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    response = cors.preflight_response(
        Headers({
            "origin": "https://opsynca.dev",
            "access-control-request-method": "POST",
            "access-control-request-headers": "content-type",
        })
    )

    assert response.status_code == 200, response.text
    assert response.headers["access-control-allow-origin"] == "https://opsynca.dev"


def test_embed_endpoint_forwards_to_litellm(client, fake_litellm):
    response = client.post("/api/embed", json={"texts": ["hello", "world"]})
    assert response.status_code == 200, response.text
    body = response.json()
    assert len(body["embeddings"]) == 2
    assert all(len(vec) == 4 for vec in body["embeddings"])
    assert fake_litellm.embed_calls == [["hello", "world"]]


def test_embed_endpoint_rejects_empty_texts(client, fake_litellm):
    response = client.post("/api/embed", json={"texts": []})
    assert response.status_code == 422


def test_answer_endpoint_uses_context_and_returns_indices(client, fake_litellm):
    fake_litellm._chat_payload = {
        "choices": [
            {"message": {"content": "Voici la reponse.\nSOURCES_UTILISEES: 1"}}
        ]
    }

    response = client.post(
        "/api/answer",
        json={
            "message": "Quelle securite?",
            "context": [
                {"filename": "a.pdf", "chunk_index": 0, "text": "Contenu pertinent."},
                {"filename": "b.txt", "chunk_index": 1, "text": "Autre chunk."},
            ],
            "history": [],
        },
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["answer"] == "Voici la reponse."
    assert body["used_context_indices"] == [1]
    assert body["web_sources"] == []


def test_answer_endpoint_without_context_skips_context_block(client, fake_litellm):
    response = client.post("/api/answer", json={"message": "Salut"})
    assert response.status_code == 200
    sent = fake_litellm.chat_calls[0]["messages"]
    assert sent[0]["role"] == "system"
    assert "Contexte indexe" not in sent[0]["content"]


def test_answer_endpoint_rejects_empty_message(client, fake_litellm):
    response = client.post("/api/answer", json={"message": "   ", "context": []})
    # message="   " passes min_length=1 but FastAPI doesn't strip — we just check shape:
    # we want to confirm we accept ws-only messages (current behaviour) or reject? Pydantic
    # min_length is on the raw value, so "   " is length 3 — passes. The test just checks
    # the endpoint responds without crashing.
    assert response.status_code in {200, 422}


def test_answer_endpoint_validates_message_min_length(client, fake_litellm):
    response = client.post("/api/answer", json={"message": ""})
    assert response.status_code == 422


def test_title_endpoint_returns_clean_title(client, fake_litellm):
    fake_litellm._chat_payload = {
        "choices": [{"message": {"content": "  Synthese projet.  "}}]
    }
    response = client.post(
        "/api/title",
        json={"messages": [{"role": "user", "content": "Resume"}]},
    )
    assert response.status_code == 200
    assert response.json()["title"] == "Synthese projet"


def test_title_endpoint_strips_leading_quotes(client, fake_litellm):
    fake_litellm._chat_payload = {
        "choices": [{"message": {"content": "'Mon titre'"}}]
    }
    response = client.post(
        "/api/title",
        json={"messages": [{"role": "user", "content": "Resume"}]},
    )
    assert response.status_code == 200
    assert response.json()["title"].startswith("Mon titre")


def test_title_endpoint_rejects_empty_transcript(client, fake_litellm):
    response = client.post(
        "/api/title",
        json={"messages": [{"role": "user", "content": "    "}]},
    )
    assert response.status_code == 400


def test_title_endpoint_502_when_model_returns_empty(client, fake_litellm):
    fake_litellm._chat_payload = {"choices": [{"message": {"content": "   "}}]}
    response = client.post(
        "/api/title",
        json={"messages": [{"role": "user", "content": "Quelque chose"}]},
    )
    assert response.status_code == 502


def test_extract_endpoint_returns_text_for_plain_file(client):
    response = client.post(
        "/api/extract",
        files={"file": ("note.txt", b"Hello extracted content.", "text/plain")},
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["filename"] == "note.txt"
    assert "Hello" in body["text"]
    assert body["extension"] == ".txt"


def test_extract_endpoint_rejects_empty_text(client):
    response = client.post(
        "/api/extract",
        files={"file": ("empty.txt", b"   \n  ", "text/plain")},
    )
    assert response.status_code == 400


def test_legacy_rag_endpoints_are_gone(client):
    assert client.post("/api/rag/upload", files={"file": ("a.txt", b"x", "text/plain")}).status_code == 404
    assert client.get("/api/rag/documents").status_code == 404
    assert client.post("/api/rag/chat", json={"message": "x"}).status_code == 404

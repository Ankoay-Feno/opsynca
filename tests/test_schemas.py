import pytest
from pydantic import ValidationError

from api.rag.schemas import (
    AnswerRequest,
    ContextChunk,
    EmbedRequest,
    HistoryMessage,
    TitleRequest,
)


def test_answer_request_defaults():
    req = AnswerRequest(message="bonjour")
    assert req.context == []
    assert req.history == []


def test_answer_request_rejects_empty_message():
    with pytest.raises(ValidationError):
        AnswerRequest(message="")


def test_answer_request_accepts_context():
    chunk = ContextChunk(filename="a.pdf", chunk_index=0, text="contenu")
    req = AnswerRequest(message="q", context=[chunk])
    assert req.context[0].text == "contenu"


def test_context_chunk_rejects_empty_text():
    with pytest.raises(ValidationError):
        ContextChunk(text="")


def test_embed_request_requires_at_least_one_text():
    EmbedRequest(texts=["x"])
    with pytest.raises(ValidationError):
        EmbedRequest(texts=[])


def test_history_message_role_restricted():
    HistoryMessage(role="user", content="hi")
    HistoryMessage(role="assistant", content="hi")
    with pytest.raises(ValidationError):
        HistoryMessage(role="system", content="hi")


def test_title_request_requires_messages():
    with pytest.raises(ValidationError):
        TitleRequest(messages=[])

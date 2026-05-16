from __future__ import annotations

import re
from dataclasses import dataclass


@dataclass(frozen=True)
class TextChunk:
    index: int
    text: str


def clean_for_indexing(text: str) -> str:
    text = text.replace("\x00", " ")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n[ \t]+", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = "\n".join(line.strip() for line in text.splitlines())
    return text.strip()


def chunk_text(text: str, *, chunk_size: int = 1200, overlap: int = 180) -> list[TextChunk]:
    cleaned = clean_for_indexing(text)
    if not cleaned:
        return []

    paragraphs = [part.strip() for part in re.split(r"\n\s*\n", cleaned) if part.strip()]
    chunks: list[TextChunk] = []
    current = ""

    for paragraph in paragraphs:
        if len(paragraph) > chunk_size:
            chunks.extend(_split_long_text(paragraph, chunk_size=chunk_size, overlap=overlap, start=len(chunks)))
            current = ""
            continue

        candidate = f"{current}\n\n{paragraph}".strip() if current else paragraph
        if len(candidate) <= chunk_size:
            current = candidate
            continue

        if current:
            chunks.append(TextChunk(len(chunks), current))
        current = paragraph

    if current:
        chunks.append(TextChunk(len(chunks), current))

    return chunks


def _split_long_text(text: str, *, chunk_size: int, overlap: int, start: int) -> list[TextChunk]:
    chunks: list[TextChunk] = []
    cursor = 0

    while cursor < len(text):
        end = min(cursor + chunk_size, len(text))
        chunk = text[cursor:end].strip()
        if chunk:
            chunks.append(TextChunk(start + len(chunks), chunk))
        if end == len(text):
            break
        cursor = max(end - overlap, cursor + 1)

    return chunks

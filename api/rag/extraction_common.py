from __future__ import annotations

import re
from dataclasses import asdict, dataclass, field
from typing import Any


TEXT_EXTENSIONS = {
    ".txt",
    ".md",
    ".markdown",
    ".mdx",
    ".rst",
    ".log",
    ".csv",
    ".tsv",
    ".json",
    ".jsonl",
    ".yaml",
    ".yml",
    ".toml",
    ".ini",
    ".env",
    ".sql",
    ".py",
    ".js",
    ".jsx",
    ".ts",
    ".tsx",
    ".css",
    ".scss",
    ".html",
    ".htm",
    ".xml",
    ".svg",
    ".rtf",
}

IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".bmp", ".gif", ".tif", ".tiff"}
PDF_EXTENSIONS = {".pdf"}
WORD_EXTENSIONS = {".docx"}
SPREADSHEET_EXTENSIONS = {".xlsx"}
PRESENTATION_EXTENSIONS = {".pptx"}
OPEN_DOCUMENT_EXTENSIONS = {".odt"}


@dataclass
class ExtractedFileContents:
    filename: str
    content_type: str | None
    extension: str
    text: str
    metadata: dict[str, Any] = field(default_factory=dict)
    warnings: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def decode_text(contents: bytes) -> tuple[str, str]:
    for encoding in ("utf-8-sig", "utf-16", "latin-1"):
        try:
            return contents.decode(encoding), encoding
        except UnicodeDecodeError:
            continue
    return contents.decode("utf-8", errors="replace"), "utf-8-replace"


def normalize_text(text: str) -> str:
    text = text.replace("\x00", "")
    text = re.sub(r"[ \t]+", " ", text)
    text = "\n".join(line.strip() for line in text.splitlines())
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def looks_like_text(text: str) -> bool:
    if not text:
        return False

    sample = text[:2000]
    printable = sum(char.isprintable() or char in "\n\r\t" for char in sample)
    return printable / max(len(sample), 1) > 0.85


def unique_warnings(warnings: list[str]) -> list[str]:
    seen: set[str] = set()
    unique: list[str] = []

    for warning in warnings:
        if warning and warning not in seen:
            unique.append(warning)
            seen.add(warning)

    return unique

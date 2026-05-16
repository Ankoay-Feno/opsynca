from __future__ import annotations

import csv
import io
import json
import re
from html.parser import HTMLParser

from api.rag.extraction_common import ExtractedFileContents, decode_text, normalize_text


class _HTMLTextParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self._parts: list[str] = []

    def handle_data(self, data: str) -> None:
        cleaned = data.strip()
        if cleaned:
            self._parts.append(cleaned)

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag in {"br", "p", "div", "section", "article", "li", "tr", "h1", "h2", "h3"}:
            self._parts.append("\n")

    def get_text(self) -> str:
        return normalize_text(" ".join(self._parts))


def extract_text_bytes(
    contents: bytes,
    *,
    filename: str,
    content_type: str | None,
    extension: str,
) -> ExtractedFileContents:
    text, encoding = decode_text(contents)
    metadata: dict[str, object] = {"encoding": encoding, "bytes": len(contents)}
    warnings: list[str] = []

    if extension == ".json":
        text = format_json_text(text, warnings)
    elif extension == ".jsonl":
        text = format_jsonl_text(text, warnings)
    elif extension in {".csv", ".tsv"}:
        text = normalize_delimited_text(text, delimiter="\t" if extension == ".tsv" else ",")
    elif extension in {".html", ".htm", ".xml", ".svg"}:
        text = extract_markup_text(text)
    elif extension == ".rtf":
        text = extract_rtf_text(text)
    else:
        text = normalize_text(text)

    return ExtractedFileContents(filename, content_type, extension, text, metadata, warnings)


def format_json_text(text: str, warnings: list[str]) -> str:
    try:
        return json.dumps(json.loads(text), ensure_ascii=False, indent=2)
    except json.JSONDecodeError as exc:
        warnings.append(f"JSON invalide, garde comme texte brut: {exc}")
        return normalize_text(text)


def format_jsonl_text(text: str, warnings: list[str]) -> str:
    lines: list[str] = []

    for line_number, line in enumerate(text.splitlines(), start=1):
        stripped = line.strip()
        if not stripped:
            continue
        try:
            lines.append(json.dumps(json.loads(stripped), ensure_ascii=False))
        except json.JSONDecodeError as exc:
            warnings.append(f"JSONL ligne {line_number} invalide, garde la ligne brute: {exc}")
            lines.append(stripped)

    return "\n".join(lines)


def normalize_delimited_text(text: str, delimiter: str) -> str:
    reader = csv.reader(io.StringIO(text), delimiter=delimiter)
    return "\n".join("\t".join(cell.strip() for cell in row) for row in reader)


def extract_markup_text(text: str) -> str:
    parser = _HTMLTextParser()

    try:
        parser.feed(text)
        parsed = parser.get_text()
        return parsed or normalize_text(re.sub(r"<[^>]+>", " ", text))
    except Exception:
        return normalize_text(re.sub(r"<[^>]+>", " ", text))


def extract_rtf_text(text: str) -> str:
    text = re.sub(r"{\\[^{}]+}|[{}]", " ", text)
    text = re.sub(r"\\'[0-9a-fA-F]{2}", " ", text)
    text = re.sub(r"\\[a-zA-Z]+\d* ?", " ", text)
    return normalize_text(text)

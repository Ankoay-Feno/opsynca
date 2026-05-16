from __future__ import annotations

import mimetypes
from pathlib import Path
from typing import Any

from fastapi import UploadFile

from api.rag.extraction_common import (
    IMAGE_EXTENSIONS,
    OPEN_DOCUMENT_EXTENSIONS,
    PDF_EXTENSIONS,
    PRESENTATION_EXTENSIONS,
    SPREADSHEET_EXTENSIONS,
    TEXT_EXTENSIONS,
    WORD_EXTENSIONS,
    ExtractedFileContents,
    decode_text,
    looks_like_text,
    normalize_text,
)
from api.rag.media_extractors import extract_image_bytes, extract_pdf_bytes
from api.rag.office_extractors import (
    extract_docx_bytes,
    extract_odt_bytes,
    extract_pptx_bytes,
    extract_xlsx_bytes,
)
from api.rag.text_extractors import extract_text_bytes


class FileContentExtractor:
    @staticmethod
    async def extract_file_contents(
        file: UploadFile,
        *,
        max_pdf_ocr_pages: int = 10,
    ) -> dict[str, Any]:
        contents = await FileContentExtractor._read_upload(file)
        filename = file.filename or "uploaded-file"
        extension = Path(filename).suffix.lower()
        content_type = file.content_type or mimetypes.guess_type(filename)[0]

        result = FileContentExtractor.extract_bytes(
            contents,
            filename=filename,
            content_type=content_type,
            extension=extension,
            max_pdf_ocr_pages=max_pdf_ocr_pages,
        )
        return result.to_dict()

    @staticmethod
    async def extract_pdf_contents(file: UploadFile) -> dict[str, Any]:
        contents = await FileContentExtractor._read_upload(file)
        filename = file.filename or "uploaded.pdf"
        return extract_pdf_bytes(contents, filename=filename, content_type=file.content_type).to_dict()

    @staticmethod
    async def extract_image_contents(file: UploadFile) -> dict[str, Any]:
        contents = await FileContentExtractor._read_upload(file)
        filename = file.filename or "uploaded-image"
        return extract_image_bytes(contents, filename=filename, content_type=file.content_type).to_dict()

    @staticmethod
    def extract_bytes(
        contents: bytes,
        *,
        filename: str,
        content_type: str | None,
        extension: str,
        max_pdf_ocr_pages: int,
    ) -> ExtractedFileContents:
        if FileContentExtractor._is_pdf(extension, content_type):
            return extract_pdf_bytes(
                contents,
                filename=filename,
                content_type=content_type,
                max_ocr_pages=max_pdf_ocr_pages,
            )
        if FileContentExtractor._is_image(extension, content_type):
            return extract_image_bytes(contents, filename=filename, content_type=content_type)
        if extension in WORD_EXTENSIONS:
            return extract_docx_bytes(contents, filename, content_type)
        if extension in SPREADSHEET_EXTENSIONS:
            return extract_xlsx_bytes(contents, filename, content_type)
        if extension in PRESENTATION_EXTENSIONS:
            return extract_pptx_bytes(contents, filename, content_type)
        if extension in OPEN_DOCUMENT_EXTENSIONS:
            return extract_odt_bytes(contents, filename, content_type)
        if FileContentExtractor._is_text(extension, content_type):
            return extract_text_bytes(
                contents,
                filename=filename,
                content_type=content_type,
                extension=extension,
            )

        return FileContentExtractor.extract_unknown_bytes(
            contents,
            filename=filename,
            content_type=content_type,
            extension=extension,
        )

    @staticmethod
    def extract_unknown_bytes(
        contents: bytes,
        *,
        filename: str,
        content_type: str | None,
        extension: str,
    ) -> ExtractedFileContents:
        warnings: list[str] = []
        text, encoding = decode_text(contents)
        metadata: dict[str, Any] = {"bytes": len(contents), "encoding": encoding}

        if looks_like_text(text):
            text = normalize_text(text)
            warnings.append("Type de fichier non reconnu, contenu decode comme texte.")
        else:
            text = ""
            warnings.append(f"Type de fichier non supporte: {content_type or extension or 'inconnu'}.")

        return ExtractedFileContents(filename, content_type, extension, text, metadata, warnings)

    @staticmethod
    async def _read_upload(file: UploadFile) -> bytes:
        contents = await file.read()
        try:
            await file.seek(0)
        except Exception:
            pass
        return contents

    @staticmethod
    def _is_pdf(extension: str, content_type: str | None) -> bool:
        return extension in PDF_EXTENSIONS or content_type == "application/pdf"

    @staticmethod
    def _is_image(extension: str, content_type: str | None) -> bool:
        return extension in IMAGE_EXTENSIONS or bool(content_type and content_type.startswith("image/"))

    @staticmethod
    def _is_text(extension: str, content_type: str | None) -> bool:
        return extension in TEXT_EXTENSIONS or bool(
            content_type
            and (
                content_type.startswith("text/")
                or content_type
                in {
                    "application/json",
                    "application/xml",
                    "application/x-yaml",
                    "application/yaml",
                }
            )
        )

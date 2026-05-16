from __future__ import annotations

import io
from pathlib import Path
from typing import Any

from api.rag.extraction_common import ExtractedFileContents, normalize_text, unique_warnings


def extract_pdf_bytes(
    contents: bytes,
    *,
    filename: str,
    content_type: str | None,
    max_ocr_pages: int = 10,
) -> ExtractedFileContents:
    warnings: list[str] = []
    metadata: dict[str, Any] = {"bytes": len(contents)}

    text = _extract_pdf_with_pymupdf(contents, metadata, warnings)
    if not text:
        text = _extract_pdf_with_pypdf(contents, metadata, warnings)

    if not text:
        text = _ocr_pdf_with_pymupdf(contents, metadata, warnings, max_pages=max_ocr_pages)

    if not text:
        warnings.append(
            "Aucun texte PDF extrait. Installe PyMuPDF ou pypdf pour les PDF texte, "
            "puis Pillow + pytesseract + tesseract-ocr pour les PDF scannes."
        )

    return ExtractedFileContents(
        filename=filename,
        content_type=content_type or "application/pdf",
        extension=".pdf",
        text=normalize_text(text),
        metadata=metadata,
        warnings=unique_warnings(warnings),
    )


def extract_image_bytes(
    contents: bytes,
    *,
    filename: str,
    content_type: str | None,
) -> ExtractedFileContents:
    warnings: list[str] = []
    metadata: dict[str, Any] = {"bytes": len(contents)}
    extension = Path(filename).suffix.lower()
    text = ""

    try:
        from PIL import Image
    except ImportError:
        warnings.append("Pillow n'est pas installe: impossible de lire les metadonnees image.")
        return ExtractedFileContents(filename, content_type, extension, text, metadata, warnings)

    try:
        with Image.open(io.BytesIO(contents)) as image:
            metadata.update(
                {
                    "format": image.format,
                    "width": image.width,
                    "height": image.height,
                    "mode": image.mode,
                }
            )
            text = ocr_image(image, warnings)
    except Exception as exc:
        warnings.append(f"Image illisible: {exc}")

    if not text:
        warnings.append(
            "Aucun texte image extrait. Pour OCR: installe pytesseract et le binaire systeme tesseract-ocr."
        )

    return ExtractedFileContents(
        filename=filename,
        content_type=content_type,
        extension=extension,
        text=normalize_text(text),
        metadata=metadata,
        warnings=unique_warnings(warnings),
    )


def _extract_pdf_with_pymupdf(contents: bytes, metadata: dict[str, Any], warnings: list[str]) -> str:
    try:
        import fitz
    except ImportError:
        warnings.append("PyMuPDF n'est pas installe: extraction PDF fitz ignoree.")
        return ""

    try:
        with fitz.open(stream=contents, filetype="pdf") as document:
            metadata["pages"] = document.page_count
            return "\n\n".join(page.get_text("text") for page in document)
    except Exception as exc:
        warnings.append(f"Extraction PDF avec PyMuPDF impossible: {exc}")
        return ""


def _extract_pdf_with_pypdf(contents: bytes, metadata: dict[str, Any], warnings: list[str]) -> str:
    try:
        from pypdf import PdfReader
    except ImportError:
        warnings.append("pypdf n'est pas installe: extraction PDF pypdf ignoree.")
        return ""

    try:
        reader = PdfReader(io.BytesIO(contents))
        metadata.setdefault("pages", len(reader.pages))
        return "\n\n".join((page.extract_text() or "") for page in reader.pages)
    except Exception as exc:
        warnings.append(f"Extraction PDF avec pypdf impossible: {exc}")
        return ""


def _ocr_pdf_with_pymupdf(
    contents: bytes,
    metadata: dict[str, Any],
    warnings: list[str],
    *,
    max_pages: int,
) -> str:
    try:
        import fitz
        from PIL import Image
    except ImportError:
        warnings.append("OCR PDF ignore: PyMuPDF ou Pillow n'est pas installe.")
        return ""

    try:
        with fitz.open(stream=contents, filetype="pdf") as document:
            page_count = document.page_count
            metadata.setdefault("pages", page_count)
            metadata["ocr_pages"] = min(page_count, max_pages)
            parts = [_ocr_pdf_page(document, page_index, fitz, Image, warnings) for page_index in range(min(page_count, max_pages))]

        if page_count > max_pages:
            warnings.append(f"OCR limite aux {max_pages} premieres pages du PDF.")
        return "\n\n".join(parts)
    except Exception as exc:
        warnings.append(f"OCR PDF impossible: {exc}")
        return ""


def _ocr_pdf_page(document: Any, page_index: int, fitz: Any, image_class: Any, warnings: list[str]) -> str:
    page = document.load_page(page_index)
    pixmap = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
    image = image_class.open(io.BytesIO(pixmap.tobytes("png")))
    return ocr_image(image, warnings)


def ocr_image(image: Any, warnings: list[str]) -> str:
    try:
        import pytesseract
    except ImportError:
        warnings.append("pytesseract n'est pas installe: OCR image ignore.")
        return ""

    try:
        return pytesseract.image_to_string(image)
    except Exception as exc:
        warnings.append(f"OCR image impossible: {exc}")
        return ""

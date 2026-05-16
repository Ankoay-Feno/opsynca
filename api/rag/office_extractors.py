from __future__ import annotations

import io
import zipfile
from typing import Any
from xml.etree import ElementTree

from api.rag.extraction_common import ExtractedFileContents, normalize_text, unique_warnings


def extract_docx_bytes(contents: bytes, filename: str, content_type: str | None) -> ExtractedFileContents:
    warnings: list[str] = []
    metadata: dict[str, Any] = {"bytes": len(contents)}
    paths = ["word/document.xml"]
    paths.extend(f"word/header{i}.xml" for i in range(1, 10))
    paths.extend(f"word/footer{i}.xml" for i in range(1, 10))
    text = extract_text_from_office_zip(contents, paths, warnings)

    return ExtractedFileContents(filename, content_type, ".docx", text, metadata, unique_warnings(warnings))


def extract_pptx_bytes(contents: bytes, filename: str, content_type: str | None) -> ExtractedFileContents:
    warnings: list[str] = []
    metadata: dict[str, Any] = {"bytes": len(contents)}

    try:
        with zipfile.ZipFile(io.BytesIO(contents)) as archive:
            slide_paths = sorted(
                path for path in archive.namelist() if path.startswith("ppt/slides/slide") and path.endswith(".xml")
            )
            metadata["slides"] = len(slide_paths)
            text = extract_text_from_office_zip(contents, slide_paths, warnings)
    except zipfile.BadZipFile:
        text = ""
        warnings.append("PPTX invalide ou corrompu.")

    return ExtractedFileContents(filename, content_type, ".pptx", text, metadata, unique_warnings(warnings))


def extract_xlsx_bytes(contents: bytes, filename: str, content_type: str | None) -> ExtractedFileContents:
    warnings: list[str] = []
    metadata: dict[str, Any] = {"bytes": len(contents)}
    lines: list[str] = []

    try:
        with zipfile.ZipFile(io.BytesIO(contents)) as archive:
            shared_strings = read_xlsx_shared_strings(archive)
            sheet_paths = sorted(
                path for path in archive.namelist() if path.startswith("xl/worksheets/sheet") and path.endswith(".xml")
            )
            metadata["sheets"] = len(sheet_paths)

            for index, sheet_path in enumerate(sheet_paths, start=1):
                sheet_lines = read_xlsx_sheet(archive, sheet_path, shared_strings)
                if sheet_lines:
                    lines.append(f"# Sheet {index}")
                    lines.extend(sheet_lines)
    except zipfile.BadZipFile:
        warnings.append("XLSX invalide ou corrompu.")

    return ExtractedFileContents(filename, content_type, ".xlsx", normalize_text("\n".join(lines)), metadata, unique_warnings(warnings))


def extract_odt_bytes(contents: bytes, filename: str, content_type: str | None) -> ExtractedFileContents:
    warnings: list[str] = []
    metadata: dict[str, Any] = {"bytes": len(contents)}
    text = extract_text_from_office_zip(contents, ["content.xml"], warnings)

    return ExtractedFileContents(filename, content_type, ".odt", text, metadata, unique_warnings(warnings))


def extract_text_from_office_zip(contents: bytes, xml_paths: list[str], warnings: list[str]) -> str:
    parts: list[str] = []

    try:
        with zipfile.ZipFile(io.BytesIO(contents)) as archive:
            available = set(archive.namelist())
            for xml_path in xml_paths:
                if xml_path in available:
                    parts.extend(extract_text_from_xml_bytes(archive.read(xml_path)))
    except zipfile.BadZipFile:
        warnings.append("Fichier Office invalide ou corrompu.")
    except ElementTree.ParseError as exc:
        warnings.append(f"XML Office illisible: {exc}")

    return normalize_text("\n".join(part for part in parts if part))


def extract_text_from_xml_bytes(xml_bytes: bytes) -> list[str]:
    root = ElementTree.fromstring(xml_bytes)
    lines: list[str] = []

    for element in root.iter():
        tag = element.tag.rsplit("}", 1)[-1]
        if tag in {"p", "h", "t", "span"} and element.text:
            lines.append(element.text)
        elif tag == "tab":
            lines.append("\t")
        elif tag in {"br", "cr"}:
            lines.append("\n")

    return lines


def read_xlsx_shared_strings(archive: zipfile.ZipFile) -> list[str]:
    if "xl/sharedStrings.xml" not in archive.namelist():
        return []

    root = ElementTree.fromstring(archive.read("xl/sharedStrings.xml"))
    strings: list[str] = []

    for item in root.iter():
        if item.tag.rsplit("}", 1)[-1] == "si":
            values = [child.text or "" for child in item.iter() if child.tag.rsplit("}", 1)[-1] == "t"]
            strings.append("".join(values))

    return strings


def read_xlsx_sheet(archive: zipfile.ZipFile, sheet_path: str, shared_strings: list[str]) -> list[str]:
    root = ElementTree.fromstring(archive.read(sheet_path))
    rows: list[str] = []

    for row in root.iter():
        if row.tag.rsplit("}", 1)[-1] != "row":
            continue
        cells = [read_xlsx_cell(cell, shared_strings) for cell in row if cell.tag.rsplit("}", 1)[-1] == "c"]
        if any(cells):
            rows.append("\t".join(cells))

    return rows


def read_xlsx_cell(cell: ElementTree.Element, shared_strings: list[str]) -> str:
    cell_type = cell.attrib.get("t")
    value = ""

    for child in cell.iter():
        tag = child.tag.rsplit("}", 1)[-1]
        if tag == "v" and child.text is not None:
            value = child.text
            break
        if tag == "t" and child.text is not None:
            value += child.text

    if cell_type == "s" and value.isdigit():
        index = int(value)
        if 0 <= index < len(shared_strings):
            return shared_strings[index]

    return value

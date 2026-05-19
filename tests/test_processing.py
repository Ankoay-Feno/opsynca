from api.rag.processing import chunk_text, clean_for_indexing


def test_clean_strips_null_and_collapses_whitespace():
    raw = "Hello\x00 world\n\n\n\n  next  line   with  spaces "
    cleaned = clean_for_indexing(raw)
    assert "\x00" not in cleaned
    assert "  " not in cleaned.replace("\n", "")
    assert "\n\n\n" not in cleaned
    assert cleaned.startswith("Hello world")


def test_clean_returns_empty_on_blank():
    assert clean_for_indexing("   \n\t  ") == ""


def test_chunk_text_empty_returns_no_chunks():
    assert chunk_text("") == []


def test_chunk_text_keeps_short_paragraphs_together():
    text = "Premier paragraphe.\n\nDeuxieme paragraphe."
    chunks = chunk_text(text, chunk_size=200, overlap=20)
    assert len(chunks) == 1
    assert "Premier" in chunks[0].text
    assert "Deuxieme" in chunks[0].text
    assert chunks[0].index == 0


def test_chunk_text_splits_long_paragraphs_with_overlap():
    long_paragraph = "Phrase. " * 400  # ~3200 chars
    chunks = chunk_text(long_paragraph, chunk_size=500, overlap=50)
    assert len(chunks) > 1
    assert all(len(chunk.text) <= 500 for chunk in chunks)
    indices = [chunk.index for chunk in chunks]
    assert indices == list(range(len(chunks)))


def test_chunk_text_indices_are_contiguous_after_long_paragraph():
    long = "A" * 2000
    chunks = chunk_text(f"Court paragraphe.\n\n{long}", chunk_size=300, overlap=20)
    assert len(chunks) > 1
    assert [chunk.index for chunk in chunks] == list(range(len(chunks)))
    assert all(len(chunk.text) <= 300 for chunk in chunks)

from api.rag.router import (
    _extract_indices,
    _extract_web_sources,
    _parse_answer,
    _strip_reasoning,
    _supports_google_search,
)


def test_strip_reasoning_removes_think_block():
    raw = "<think>Je reflechis a la reponse...</think>Voici la reponse finale."
    assert _strip_reasoning(raw) == "Voici la reponse finale."


def test_strip_reasoning_removes_multiline_and_multiple_blocks():
    raw = "<think>\nligne 1\nligne 2\n</think>Debut.<think>encore</think> Fin."
    assert _strip_reasoning(raw) == "Debut. Fin."


def test_strip_reasoning_handles_dangling_closing_tag():
    raw = "raisonnement sans ouverture</think>La vraie reponse."
    assert _strip_reasoning(raw) == "La vraie reponse."


def test_strip_reasoning_leaves_normal_text_untouched():
    raw = "Une reponse normale sans balise."
    assert _strip_reasoning(raw) == "Une reponse normale sans balise."


def test_supports_google_search_true_for_gemini():
    assert _supports_google_search("gemini/gemini-2.5-flash") is True
    assert _supports_google_search("Gemini/anything") is True


def test_supports_google_search_false_for_others():
    assert _supports_google_search("gpt-4o-mini") is False
    assert _supports_google_search("claude-sonnet") is False


def test_parse_answer_extracts_used_indices():
    raw = "Voici la reponse.\nSOURCES_UTILISEES: 1, 3"
    answer, indices = _parse_answer(raw, max_index=3)
    assert answer == "Voici la reponse."
    assert indices == [1, 3]


def test_parse_answer_strips_inline_marker():
    raw = "Tu peux me contacter a x@y.com. SOURCES_UTILISEES: 1,2,4,5"
    answer, indices = _parse_answer(raw, max_index=5)
    assert answer == "Tu peux me contacter a x@y.com."
    assert indices == [1, 2, 4, 5]


def test_parse_answer_strips_alternate_marker_name():
    raw = "Tu peux m'ecrire a x@y.com.getSource: 1,8"
    answer, indices = _parse_answer(raw, max_index=8)
    assert answer == "Tu peux m'ecrire a x@y.com."
    assert indices == [1, 8]


def test_parse_answer_keeps_sentence_with_non_index_colon():
    raw = "Voici la source: une explication detaillee du sujet."
    answer, indices = _parse_answer(raw, max_index=3)
    assert answer == raw
    assert indices == []


def test_parse_answer_handles_none_marker():
    raw = "Reponse libre.\nSOURCES_UTILISEES: aucune"
    answer, indices = _parse_answer(raw, max_index=2)
    assert answer == "Reponse libre."
    assert indices == []


def test_parse_answer_returns_full_text_when_no_marker():
    raw = "Reponse sans marqueur."
    answer, indices = _parse_answer(raw, max_index=2)
    assert answer == raw
    assert indices == []


def test_parse_answer_ignores_out_of_range_indices():
    raw = "Texte.\nSOURCES_UTILISEES: 1, 99, 2"
    answer, indices = _parse_answer(raw, max_index=2)
    assert answer == "Texte."
    assert indices == [1, 2]


def test_extract_indices_deduplicates_and_clips():
    assert _extract_indices("1, 2, 2, 3, 7", max_index=3) == [1, 2, 3]


def test_extract_web_sources_from_message_grounding():
    response = {
        "choices": [
            {
                "message": {
                    "groundingMetadata": {
                        "groundingChunks": [
                            {"web": {"uri": "https://example.com", "title": "Example"}},
                            {"web": {"uri": "https://example.com", "title": "Duplicate"}},
                            {"web": {"uri": "https://other.test"}},
                        ]
                    }
                }
            }
        ]
    }
    sources = _extract_web_sources(response)
    assert len(sources) == 2
    assert sources[0].uri == "https://example.com"
    assert sources[0].title == "Example"
    assert sources[1].uri == "https://other.test"
    assert sources[1].title is None


def test_extract_web_sources_returns_empty_when_missing():
    assert _extract_web_sources({"choices": [{"message": {}}]}) == []

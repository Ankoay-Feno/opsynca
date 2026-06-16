from __future__ import annotations


def matches_any(haystack: str, keywords: list[str]) -> bool:
    """True si au moins un mot-cle apparait dans `haystack` (insensible casse).

    Sert a filtrer localement les sources "flux" (Himalayas, Arbeitnow,
    RemoteOK) qui renvoient un catalogue recent sans filtrage serveur. Une
    liste de mots-cles vide => tout passe (mode navigation).
    """
    if not keywords:
        return True
    low = haystack.lower()
    return any(keyword.lower() in low for keyword in keywords if keyword)

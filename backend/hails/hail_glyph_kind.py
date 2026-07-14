"""Glyph Hero Kind routing — Places / People / Characters under proto (step 23).

Replaces icon/slot roulette as default Forge Reset. Slot recipes remain grammar-lab
(saved glyphs + explicit family_id only). See doctrine-hail-glyph-hero-style.
"""

from __future__ import annotations

import re
from typing import Final, Literal, Protocol

from hails.hail_glyph_icons import resolve_keyword_icon_match

GlyphKind = Literal["character", "place", "person", "icon", "slot_lab"]

_KIND_CHARACTER: Final[GlyphKind] = "character"
_KIND_PLACE: Final[GlyphKind] = "place"
_KIND_PERSON: Final[GlyphKind] = "person"
_KIND_ICON: Final[GlyphKind] = "icon"
_KIND_SLOT_LAB: Final[GlyphKind] = "slot_lab"

_TOKEN_RE = re.compile(r"[a-z0-9]+")

_PLACE_KEYWORDS: Final[frozenset[str]] = frozenset(
    {
        "ohio",
        "virginia",
        "cleveland",
        "washington",
        "state",
        "city",
        "country",
        "place",
        "home",
        "mars",
        "planet",
        "moon",
        "beacon",
        "landmark",
        "dc",
    }
)
_PERSON_KEYWORDS: Final[frozenset[str]] = frozenset(
    {
        "mom",
        "dad",
        "face",
        "portrait",
        "person",
        "human",
        "people",
    }
)
_CHARACTER_KEYWORDS: Final[frozenset[str]] = frozenset(
    {
        "guardian",
        "mascot",
        "panda",
        "dragon",
        "creature",
        "hero",
        "spirit",
        "animal",
        "trek",
        "fleet",
    }
)

# Default Reset distribution (percent, must sum ≤100). Slot lab = remix-only exploration.
_DEFAULT_KIND_WEIGHTS: Final[tuple[tuple[GlyphKind, int], ...]] = (
    (_KIND_CHARACTER, 45),
    (_KIND_PLACE, 35),
    (_KIND_PERSON, 20),
)


class _KindRng(Protocol):
    def _next(self) -> int: ...


def _tokenize(text: str) -> set[str]:
    return set(_TOKEN_RE.findall((text or "").lower()))


def _keyword_kind(glyph_name: str, hail_name: str) -> GlyphKind | None:
    tokens = _tokenize(glyph_name) | _tokenize(hail_name)
    if tokens & _PLACE_KEYWORDS:
        return _KIND_PLACE
    if tokens & _PERSON_KEYWORDS:
        return _KIND_PERSON
    if tokens & _CHARACTER_KEYWORDS:
        return _KIND_CHARACTER
    return None


def resolve_glyph_kind(
    rng: _KindRng,
    bucket: str,
    *,
    glyph_name: str = "",
    hail_name: str = "",
    remix: bool = False,
) -> GlyphKind:
    """Pick Kind for a new seed / re-encode. Icon only on strong keyword hits."""
    del bucket  # reserved for future bucket→kind bias
    from hails.hail_glyph_combadge import combadge_keywords_match

    if combadge_keywords_match(glyph_name, hail_name):
        return _KIND_CHARACTER
    icon_match = resolve_keyword_icon_match(glyph_name, hail_name)
    if icon_match and icon_match[1] >= 3:
        return _KIND_ICON
    keyword_kind = _keyword_kind(glyph_name, hail_name)
    if keyword_kind is not None:
        return keyword_kind
    del remix
    roll = rng._next() % 100
    cursor = 0
    for kind, weight in _DEFAULT_KIND_WEIGHTS:
        cursor += weight
        if roll < cursor:
            return kind
    return _KIND_CHARACTER


def pick_family_for_kind(
    kind: GlyphKind,
    rng: _KindRng,
    bucket: str,
    *,
    glyph_name: str = "",
    hail_name: str = "",
    remix: bool = False,
) -> str:
    from hails.hail_glyph_character import pick_character_recipe_id
    from hails.hail_glyph_icons import pick_icon_recipe_id
    from hails.hail_glyph_people import pick_person_recipe_id
    from hails.hail_glyph_places import pick_place_recipe_id
    from hails.hail_glyph_slots import pick_weighted_slot

    if kind == _KIND_ICON:
        return pick_icon_recipe_id(
            rng,
            bucket,
            glyph_name=glyph_name,
            hail_name=hail_name,
            remix=remix,
        )
    if kind == _KIND_SLOT_LAB:
        return pick_weighted_slot(rng, bucket, reset=True)
    if kind == _KIND_PLACE:
        return pick_place_recipe_id(rng)
    if kind == _KIND_PERSON:
        return pick_person_recipe_id(rng)
    return pick_character_recipe_id(rng, glyph_name=glyph_name, hail_name=hail_name)

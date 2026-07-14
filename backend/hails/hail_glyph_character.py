"""Authored Hero Glyph characters — designed silhouettes, not slot combinatorics.

North-star proof: ``char_chunky_guardian_v1`` — lead phrase **chunky round guardian**.
See docs/hails/hero-glyph-proof-v001.md.
"""

from __future__ import annotations

from typing import Any, Final, Protocol

from hails.hail_glyph_combadge import (
    COMBADGE_DELTA_V1,
    COMBADGE_VOYAGER_V1,
    combadge_keywords_match,
    is_combadge_recipe_id,
    pick_combadge_recipe_id,
    render_combadge_recipe,
)
from hails.hail_glyph_composition import is_valid_composition

CHAR_PREFIX: Final[str] = "char_"
HERO_GLYPH_PROOF_FAMILY_ID: Final[str] = "char_chunky_guardian_v1"
HERO_GLYPH_PROOF_LEAD_PHRASE: Final[str] = "chunky round guardian"
HERO_GLYPH_PROOF_CHARACTER_TYPE: Final[str] = "mascot-character"
HERO_GLYPH_PROOF_GLYPH_ID: Final[str] = "custom-hero-glyph-proof"

CHARACTER_RECIPE_IDS: Final[tuple[str, ...]] = (
    HERO_GLYPH_PROOF_FAMILY_ID,
    COMBADGE_DELTA_V1,
    COMBADGE_VOYAGER_V1,
)


class _CharRng(Protocol):
    def _next(self) -> int: ...
    def stroke_width(self, primary: bool = True) -> float: ...


def _path(
    d: str,
    *,
    stroke_width: float = 2.5,
    fill: str = "none",
    opacity: float = 1.0,
    stroke_linecap: str = "round",
    stroke_linejoin: str | None = "round",
) -> dict[str, Any]:
    row: dict[str, Any] = {
        "d": d,
        "stroke": "currentColor",
        "stroke_width": stroke_width,
        "fill": fill,
        "opacity": opacity,
        "stroke_linecap": stroke_linecap,
    }
    if stroke_linejoin:
        row["stroke_linejoin"] = stroke_linejoin
    return row


def is_character_recipe_id(value: str) -> bool:
    trimmed = (value or "").strip()
    return trimmed.startswith(CHAR_PREFIX) and trimmed in CHARACTER_RECIPE_IDS


def pick_character_recipe_id(
    rng: _CharRng,
    *,
    glyph_name: str = "",
    hail_name: str = "",
) -> str:
    if combadge_keywords_match(glyph_name, hail_name):
        return pick_combadge_recipe_id(glyph_name=glyph_name, hail_name=hail_name)
    del rng
    return COMBADGE_DELTA_V1


def _chunky_guardian_paths(rng: _CharRng, *, variation_only: bool) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Integrated mascot — chunky round body, face, and chest sigil; ink stays inside ghost_shield_v1."""
    sw_body = max(2.6, rng.stroke_width(True))
    sw_face = max(2.5, sw_body + 0.1)
    sw_chest = max(2.55, sw_body + 0.15)
    if variation_only:
        jitter = (rng._next() % 5) * 0.04
        sw_body = round(min(3.4, sw_body + jitter), 2)
        sw_face = round(max(2.35, sw_face + jitter), 2)
        sw_chest = round(max(2.4, sw_chest + jitter), 2)

    # Round guardian mass — single chunky silhouette inside ghost_shield_v1 (no out-of-mask ears).
    body = _path(
        "M24 16.5 C29 16.5 32 19.5 32 24.5 C32 28.5 29 31 24 31 "
        "C19 31 16 28.5 16 24.5 C16 19.5 19 16.5 24 16.5",
        stroke_width=sw_body,
        fill="currentColor",
        opacity=0.92,
    )
    body["role"] = "mass"
    face = _path(
        "M18.5 22 L21.5 22 M26.5 22 L29.5 22 M20 25.5 Q24 28.5 28 25.5",
        stroke_width=sw_face,
        stroke_linecap="round",
        opacity=1.0,
    )
    face["role"] = "charge"
    chest = _path(
        "M24 26 L21.5 28.5 L24 30 L26.5 28.5 Z",
        stroke_width=sw_chest,
        stroke_linejoin="round",
        fill="currentColor",
        opacity=1.0,
    )
    chest["role"] = "accent"
    return [body, face, chest], []


def render_character_recipe(
    recipe_id: str,
    rng: _CharRng,
    *,
    variation_only: bool = False,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]], dict[str, Any]]:
    """Render an authored character grammar."""
    family = (recipe_id or "").strip()
    if is_combadge_recipe_id(family):
        return render_combadge_recipe(family, rng, variation_only=variation_only)
    if family != HERO_GLYPH_PROOF_FAMILY_ID:
        family = HERO_GLYPH_PROOF_FAMILY_ID

    for _ in range(4):
        paths, circles = _chunky_guardian_paths(rng, variation_only=variation_only)
        if is_valid_composition(paths, circles):
            composition: dict[str, Any] = {
                "schema": "char_v1",
                "character_id": "chunky_guardian",
                "lead_phrase": HERO_GLYPH_PROOF_LEAD_PHRASE,
                "character_type": HERO_GLYPH_PROOF_CHARACTER_TYPE,
                "anchor": {"cx": 24, "cy": 24},
            }
            return paths, circles, composition
    paths, circles = _chunky_guardian_paths(rng, variation_only=False)
    composition = {
        "schema": "char_v1",
        "character_id": "chunky_guardian",
        "lead_phrase": HERO_GLYPH_PROOF_LEAD_PHRASE,
        "character_type": HERO_GLYPH_PROOF_CHARACTER_TYPE,
        "anchor": {"cx": 24, "cy": 24},
    }
    return paths, circles, composition


def build_hero_glyph_proof_spec() -> dict[str, Any]:
    """Deterministic north-star Hero Glyph for package + verifier fixtures."""
    from hails.hails_composer import seed_glyph_spec

    return seed_glyph_spec(
        glyph_name="Guardian",
        glyph_id=HERO_GLYPH_PROOF_GLYPH_ID,
        glyph_family_id=HERO_GLYPH_PROOF_FAMILY_ID,
        seed=424242,
        variation_only=True,
        scale="medium",
        palette_id="axiom_dark_cyan",
        effect_id="transporter",
    )

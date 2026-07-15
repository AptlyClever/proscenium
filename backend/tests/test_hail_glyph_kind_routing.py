"""Kind-routed Forge Reset — Glyph Hero style v1 (chain step 23)."""

from __future__ import annotations

import hashlib

from hails.hail_glyph_character import CHARACTER_RECIPE_IDS, HERO_GLYPH_PROOF_FAMILY_ID
from hails.hail_glyph_kind import resolve_glyph_kind
from hails.hail_glyph_people import PERSON_RECIPE_IDS
from hails.hail_glyph_places import PLACE_RECIPE_IDS
from hails.hail_glyph_procedural import _GlyphRng, generate_procedural_graph
from hails.hail_glyph_slots import SLOT_RECIPE_IDS
from hails.hail_glyph_hero_quality import verify_procedural_graph_hero_focal_floor


def _digest(*parts: str) -> bytes:
    return hashlib.sha256("|".join(parts).encode("utf-8")).digest()


def test_default_reset_uses_kind_generators_not_slots() -> None:
    digest = _digest("kind", "routing")
    graph, _ = generate_procedural_graph(glyph_name="Velum Trace", hail_name="", seed=1, digest=digest)
    from hails.hail_glyph_combadge import COMBADGE_DELTA_V1

    assert graph["generator_id"] == COMBADGE_DELTA_V1


def test_keyword_routes_place_kind() -> None:
    digest = _digest("ohio", "place")
    graph, _ = generate_procedural_graph(
        glyph_name="Ohio",
        hail_name="",
        seed=7,
        digest=digest,
    )
    assert graph["generator_id"] in PLACE_RECIPE_IDS


def test_keyword_routes_character_kind() -> None:
    digest = _digest("guardian", "char")
    graph, _ = generate_procedural_graph(
        glyph_name="Guardian",
        hail_name="",
        seed=3,
        digest=digest,
    )
    from hails.hail_glyph_combadge import COMBADGE_DELTA_V1

    assert graph["generator_id"] == COMBADGE_DELTA_V1


def test_variation_only_keeps_character_family() -> None:
    digest = _digest("hero", "proof")
    graph, _ = generate_procedural_graph(
        glyph_name="Guardian",
        hail_name="",
        seed=424242,
        digest=digest,
        glyph_family_id=HERO_GLYPH_PROOF_FAMILY_ID,
        variation_only=True,
    )
    assert graph["generator_id"] == HERO_GLYPH_PROOF_FAMILY_ID


def test_place_and_person_pass_focal_floor() -> None:
    digest = _digest("floor", "kind")
    for seed, name in ((11, "Ohio"), (19, "Mom")):
        graph, _ = generate_procedural_graph(glyph_name=name, hail_name="", seed=seed, digest=digest)
        assert verify_procedural_graph_hero_focal_floor(graph) == [], graph["generator_id"]


def test_resolve_glyph_kind_neutral_distribution() -> None:
    rng = _GlyphRng(_digest("neutral", "kinds"), seed=None)
    kinds = {resolve_glyph_kind(rng, "neutral", glyph_name="Glyph", hail_name="") for _ in range(40)}
    assert "character" in kinds
    assert "place" in kinds
    assert "person" in kinds

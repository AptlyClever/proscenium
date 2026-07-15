"""Tests for H3.5 slot composer (field + charge rigblocks)."""

from __future__ import annotations

import hashlib

from hails.hail_glyph_composition import is_valid_composition
from hails.hail_glyph_procedural import _GlyphRng, generate_procedural_graph, is_valid_procedural_graph
from hails.hail_glyph_icons import ICON_RECIPE_IDS
from hails.hail_glyph_slots import (
    SLOT_RECIPE_IDS,
    is_slot_recipe_id,
    parse_slot_recipe_id,
    pick_weighted_slot,
    render_slot_recipe,
    slot_recipe_id,
)


def _digest(*parts: str) -> bytes:
    return hashlib.sha256("|".join(parts).encode("utf-8")).digest()


def test_slot_recipe_catalog_excludes_cross_like_pairs() -> None:
    assert "slot_plate_star" not in SLOT_RECIPE_IDS
    assert "slot_plate_chevron" not in SLOT_RECIPE_IDS
    assert slot_recipe_id("shield", "bolt") in SLOT_RECIPE_IDS
    assert len(SLOT_RECIPE_IDS) >= 50


def test_parse_slot_recipe_id() -> None:
    assert parse_slot_recipe_id("slot_lozenge_bolt") == ("lozenge", "bolt")
    assert parse_slot_recipe_id("compose_circle_star") is None


def test_slot_recipes_render_valid_emblems() -> None:
    digest = _digest("slot", "render")
    for recipe_id in SLOT_RECIPE_IDS[:12]:
        for seed in (None, 1, 9):
            rng = _GlyphRng(digest, seed)
            paths, circles, composition = render_slot_recipe(recipe_id, rng)
            assert is_valid_composition(paths, circles), recipe_id
            assert len(paths) >= 2, recipe_id
            assert composition["field_id"] in {"shield", "orb", "lozenge", "band", "crest"}
            assert composition["charge_id"] in {
                "star",
                "bolt",
                "chevron",
                "spire",
                "flame",
                "wing",
                "ray",
                "diamond",
                "hook",
                "gem",
            }


def test_initial_seed_uses_operator_shaped_default() -> None:
    digest = _digest("Velum", "trace")
    from hails.hail_glyph_combadge import COMBADGE_DELTA_V1

    graph, _ = generate_procedural_graph(glyph_name="Velum Trace", hail_name="", seed=1, digest=digest)
    assert graph["generator_id"] == COMBADGE_DELTA_V1


def test_slot_graph_includes_composition_spec() -> None:
    digest = _digest("Fleet", "")
    graph, _ = generate_procedural_graph(
        glyph_name="Fleet",
        hail_name="",
        seed=3,
        digest=digest,
        glyph_family_id="slot_shield_star",
        variation_only=True,
    )
    assert is_slot_recipe_id(graph["generator_id"])
    assert is_valid_procedural_graph(graph)
    composition = graph.get("composition")
    assert isinstance(composition, dict)
    assert composition.get("schema") == "slot_v1"
    assert composition.get("field_id")
    assert composition.get("charge_id")


def test_slot_variation_only_preserves_recipe() -> None:
    digest = _digest("Party", "")
    recipe = "slot_orb_star"
    first, _ = generate_procedural_graph(
        glyph_name="Party",
        hail_name="",
        seed=1,
        digest=digest,
        glyph_family_id=recipe,
        variation_only=True,
    )
    assert first["generator_id"] == recipe
    second, _ = generate_procedural_graph(
        glyph_name="Party",
        hail_name="",
        seed=2,
        digest=digest,
        glyph_family_id=recipe,
        variation_only=True,
    )
    assert second["generator_id"] == recipe
    assert first["signature"] != second["signature"]


def test_motion_bucket_routes_kind_not_slot_roulette() -> None:
    digest = _digest("motion", "neutral")
    from hails.hail_glyph_character import CHARACTER_RECIPE_IDS
    from hails.hail_glyph_people import PERSON_RECIPE_IDS
    from hails.hail_glyph_places import PLACE_RECIPE_IDS

    ids = {
        generate_procedural_graph(glyph_name="Velum Motion", hail_name="", seed=s, digest=digest)[0][
            "generator_id"
        ]
        for s in range(1, 40)
    }
    kind_ids = set(CHARACTER_RECIPE_IDS) | set(PLACE_RECIPE_IDS) | set(PERSON_RECIPE_IDS)
    assert ids.issubset(kind_ids | set(SLOT_RECIPE_IDS))
    assert ids & kind_ids
    assert not ids.issubset(set(SLOT_RECIPE_IDS))


def test_pick_weighted_slot_respects_bucket() -> None:
    digest = _digest("pick", "slot")
    rng = _GlyphRng(digest, None)
    picked = {pick_weighted_slot(rng, "spark") for _ in range(40)}
    assert picked.issubset(set(SLOT_RECIPE_IDS))


def test_operator_keywords_pick_distinct_shaped_families() -> None:
    """Registered keyword subjects route to their own shaped family, distinct
    from the neutral operator default (subject recipe registry routing)."""
    digest = _digest("reset", "spread")
    from hails.hail_glyph_character import HERO_GLYPH_PROOF_FAMILY_ID
    from hails.hail_glyph_combadge import COMBADGE_DELTA_V1

    neutral, _ = generate_procedural_graph(glyph_name="Glyph", hail_name="", seed=1, digest=digest)
    guardian, _ = generate_procedural_graph(glyph_name="Guardian", hail_name="", seed=1, digest=digest)
    assert neutral["generator_id"] == COMBADGE_DELTA_V1
    assert guardian["generator_id"] == HERO_GLYPH_PROOF_FAMILY_ID
    assert guardian["generator_id"] != neutral["generator_id"]


def test_regenerate_variation_spreads_signatures() -> None:
    digest = _digest("Party", "")
    recipe = "slot_shield_flame"
    first, _ = generate_procedural_graph(
        glyph_name="Party",
        hail_name="",
        seed=1,
        digest=digest,
        glyph_family_id=recipe,
        variation_only=True,
    )
    assert first["generator_id"] == recipe
    signatures = {
        generate_procedural_graph(
            glyph_name="Party",
            hail_name="",
            seed=s,
            digest=digest,
            glyph_family_id=recipe,
            variation_only=True,
        )[0]["signature"]
        for s in range(1, 25)
    }
    assert len(signatures) >= 20


def test_variation_only_locks_optical_anchor() -> None:
    digest = _digest("Locked", "anchor")
    recipe = "slot_lozenge_bolt"
    for seed in range(1, 16):
        graph, _ = generate_procedural_graph(
            glyph_name="Locked",
            hail_name="",
            seed=seed,
            digest=digest,
            glyph_family_id=recipe,
            variation_only=True,
        )
        assert graph["generator_id"] == recipe
        anchor = graph.get("composition", {}).get("anchor")
        assert isinstance(anchor, dict)
        assert anchor.get("cx") == 24
        assert anchor.get("cy") == 24


def test_slot_composition_records_shared_anchor() -> None:
    digest = _digest("anchor", "test")
    graph, _ = generate_procedural_graph(glyph_name="Anchor", hail_name="", seed=4, digest=digest)
    anchor = graph.get("composition", {}).get("anchor")
    assert isinstance(anchor, dict)
    assert isinstance(anchor.get("cx"), int)
    assert isinstance(anchor.get("cy"), int)


def test_slot_layout_variants_differ_within_recipe() -> None:
    digest = _digest("Layout", "")
    recipe = "slot_crest_gem"
    layouts: set[str] = set()
    for seed in range(1, 36):
        graph, _ = generate_procedural_graph(
            glyph_name="Layout",
            hail_name="",
            seed=seed,
            digest=digest,
            glyph_family_id=recipe,
            variation_only=True,
        )
        layout_id = graph.get("composition", {}).get("layout_id")
        if layout_id:
            layouts.add(str(layout_id))
    assert layouts >= {"integrated", "charge_forward"} or len(layouts) >= 2

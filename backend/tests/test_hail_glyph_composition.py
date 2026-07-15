"""Tests for H3 composed emblem generation."""

from __future__ import annotations

import hashlib

from hails.hail_glyph_composition import (
    COMPOSE_FAMILY_IDS,
    is_compose_family_id,
    is_valid_composition,
    pick_weighted_compose,
    render_composition,
)
from hails.hail_glyph_procedural import (
    _GlyphRng,
    generate_procedural_graph,
    is_valid_procedural_graph,
)


def _digest(*parts: str) -> bytes:
    return hashlib.sha256("|".join(parts).encode("utf-8")).digest()


def test_compose_families_are_multi_part_emblems() -> None:
    digest = _digest("compose", "emblem")
    for family_id in COMPOSE_FAMILY_IDS:
        for seed in (None, 1, 7, 42):
            rng = _GlyphRng(digest, seed)
            paths, circles = render_composition(family_id, rng)
            assert is_valid_composition(paths, circles), family_id
            assert len(paths) >= 2, family_id
            assert len(paths) <= 3, family_id


def test_legacy_compose_variation_only_preserves_family() -> None:
    digest = _digest("Party", "")
    family = "compose_circle_star"
    first, _ = generate_procedural_graph(
        glyph_name="Party",
        hail_name="",
        seed=1,
        digest=digest,
        glyph_family_id=family,
        variation_only=True,
    )
    assert is_compose_family_id(first["generator_id"])
    second, _ = generate_procedural_graph(
        glyph_name="Party",
        hail_name="",
        seed=2,
        digest=digest,
        glyph_family_id=family,
        variation_only=True,
    )
    assert second["generator_id"] == family
    assert first["signature"] != second["signature"]
    assert len(second["paths"]) >= 2


def test_legacy_compose_graphs_remain_valid() -> None:
    digest = _digest("valid", "graphs")
    for seed in range(1, 5):
        graph, _ = generate_procedural_graph(
            glyph_name="Fleet",
            hail_name="",
            seed=seed,
            digest=digest,
            glyph_family_id="compose_lozenge_bolt",
            variation_only=True,
        )
        assert is_valid_procedural_graph(graph)
        assert is_compose_family_id(graph["generator_id"])


def test_compose_families_have_tv_field_charge_contrast() -> None:
    digest = _digest("tv", "contrast")
    for family_id in COMPOSE_FAMILY_IDS:
        rng = _GlyphRng(digest, 11)
        paths, _ = render_composition(family_id, rng)
        opacities = [float(p.get("opacity", 1.0)) for p in paths]
        assert min(opacities) <= 0.42, family_id
        assert max(opacities) >= 0.99, family_id
        charge_rows = [p for p in paths if float(p.get("opacity", 1.0)) >= 0.99]
        assert charge_rows, family_id
        assert max(float(p.get("stroke_width", 0)) for p in charge_rows) >= 2.4, family_id

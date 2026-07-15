"""Tests for hero glyph template generation (H2)."""

from __future__ import annotations

import hashlib

from hails.hail_glyph_hero_templates import (
    DEPRECATED_HERO_ALIASES,
    HERO_TEMPLATE_IDS,
    canonical_hero_family_id,
    is_hero_template_id,
    render_hero_template,
)
from hails.hail_glyph_procedural import (
    _GlyphRng,
    generate_procedural_graph,
    is_valid_procedural_graph,
)


def _digest(*parts: str) -> bytes:
    return hashlib.sha256("|".join(parts).encode("utf-8")).digest()


def test_deprecated_hero_ids_alias_to_archetypes() -> None:
    for legacy, current in DEPRECATED_HERO_ALIASES.items():
        assert canonical_hero_family_id(legacy) == current
        assert current in HERO_TEMPLATE_IDS


def test_hero_templates_are_single_subject() -> None:
    digest = _digest("single", "subject")
    for template_id in HERO_TEMPLATE_IDS:
        rng = _GlyphRng(digest, 1)
        paths, circles = render_hero_template(template_id, rng)
        assert len(paths) + len(circles) >= 1
        assert len(paths) <= 1, template_id
        assert len(circles) <= 1, template_id


def test_all_hero_templates_render_valid_graphs() -> None:
    digest = _digest("hero", "templates")
    for template_id in HERO_TEMPLATE_IDS:
        for seed in (None, 1, 7, 42):
            rng = _GlyphRng(digest, seed)
            paths, circles = render_hero_template(template_id, rng)
            graph = {
                "version": 1,
                "generator_id": template_id,
                "paths": paths,
                "circles": circles or None,
            }
            assert is_valid_procedural_graph(graph), template_id


def test_star_keyword_routes_combadge_not_icon() -> None:
    digest = _digest("Star Trek", "")
    from hails.hail_glyph_combadge import COMBADGE_DELTA_V1

    graph, _ = generate_procedural_graph(glyph_name="Star Trek", hail_name="", seed=1, digest=digest)
    assert graph["generator_id"] == COMBADGE_DELTA_V1


def test_hero_variation_only_preserves_legacy_template() -> None:
    digest = _digest("Party", "legacy")
    rng = _GlyphRng(digest, 1)
    paths, circles = render_hero_template("hero_orb", rng)
    first = {
        "version": 1,
        "generator_id": "hero_orb",
        "paths": paths,
        "circles": circles or None,
    }
    second, _ = generate_procedural_graph(
        glyph_name="Party",
        hail_name="",
        seed=2,
        digest=digest,
        glyph_family_id="hero_orb",
        variation_only=True,
    )
    assert second["generator_id"] == "hero_orb"
    assert is_valid_procedural_graph(first)
    assert is_valid_procedural_graph(second)

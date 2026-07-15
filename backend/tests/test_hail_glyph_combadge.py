"""Combadge delta generator tests."""

from __future__ import annotations

import hashlib

from hails.hail_glyph_combadge import (
    COMBADGE_DELTA_V1,
    COMBADGE_VOYAGER_V1,
    build_combadge_authored_graph,
    build_combadge_glyph_spec,
    build_combadge_plot_fixture,
    build_star_trek_combadge_spec,
    combadge_keywords_match,
    combadge_tng_traced_svg_path,
    load_traced_svg_paths,
    pick_combadge_recipe_id,
    render_combadge_recipe,
)
from hails.hail_glyph_hero_quality import verify_glyph_spec_hero_quality
from hails.hail_glyph_kind import pick_family_for_kind, resolve_glyph_kind
from hails.hail_glyph_procedural import _GlyphRng, generate_procedural_graph


def _digest(*parts: str) -> bytes:
    material = "|".join(parts)
    return hashlib.sha256(material.encode("utf-8")).digest()


class _Rng:
    def _next(self) -> int:
        return 7

    def stroke_width(self, primary: bool = True) -> float:
        return 2.6 if primary else 2.3


def test_traced_svg_is_source_of_truth() -> None:
    assert combadge_tng_traced_svg_path().is_file()
    paths = load_traced_svg_paths()
    assert len(paths) == 2
    for row in paths:
        assert str(row.get("fill") or "none").lower() in {"", "none", "currentcolor"}
        assert float(row.get("stroke_width", 0)) >= 2.0


def test_combadge_keywords_match_trek() -> None:
    assert combadge_keywords_match("Star Trek")
    assert combadge_keywords_match("Fleet Combadge")
    assert not combadge_keywords_match("Guardian")


def test_voyager_keyword_routes_voyager_recipe() -> None:
    assert pick_combadge_recipe_id(glyph_name="Voyager combadge") == COMBADGE_VOYAGER_V1
    paths, circles, composition = render_combadge_recipe(COMBADGE_VOYAGER_V1, _Rng())
    assert len(paths) == 2
    assert not circles
    assert composition["character_id"] == "combadge_voyager"
    assert all(str(p.get("fill") or "none").lower() in {"", "none"} for p in paths)


def test_star_trek_seed_uses_combadge_family() -> None:
    digest = _digest("Star Trek", "")
    graph, _family = generate_procedural_graph(
        glyph_name="Star Trek",
        hail_name="",
        seed=170100,
        digest=digest,
    )
    assert graph["generator_id"] == COMBADGE_DELTA_V1
    primary = [p for p in graph["paths"] if p.get("role") != "shadow"]
    assert len(primary) == 2


def test_combadge_plot_fixture_is_authored_stroke_graph() -> None:
    fixture = build_combadge_plot_fixture()
    graph = fixture["procedural_graph"]
    assert fixture["proof_mode"] is True
    assert fixture["reference_asset"] == "combadge-tng-reference.png"
    assert graph.get("envelope_id") is None
    primary = [p for p in graph["paths"] if p.get("role") != "shadow"]
    assert len(primary) == 2
    roles = {str(p.get("role") or "") for p in primary}
    assert roles == {"mass", "accent"}
    for row in primary:
        assert str(row.get("fill") or "none").lower() in {"", "none", "currentcolor"}
    assert "ground" not in {str(p.get("role") or "") for p in graph["paths"]}
    assert graph["composition"]["schema"] == "char_v1"


def test_authored_graph_matches_svg_loader() -> None:
    graph = build_combadge_authored_graph()
    assert graph["paths"] == load_traced_svg_paths()


def test_combadge_passes_hero_quality() -> None:
    paths, circles, composition = render_combadge_recipe(COMBADGE_DELTA_V1, _Rng())
    assert composition["lead_phrase"] == "delta combadge"
    assert len(paths) == 2
    assert not circles
    spec = build_star_trek_combadge_spec()
    assert spec["glyph_family_id"] == COMBADGE_DELTA_V1
    assert verify_glyph_spec_hero_quality(spec) == []


def test_kind_routing_picks_combadge_for_trek() -> None:
    rng = _GlyphRng(_digest("Star Trek", ""), 42)
    kind = resolve_glyph_kind(rng, "neutral", glyph_name="Star Trek")
    assert kind == "character"
    family = pick_family_for_kind(kind, rng, "neutral", glyph_name="Star Trek")
    assert family == COMBADGE_DELTA_V1


def test_build_combadge_glyph_spec() -> None:
    spec = build_combadge_glyph_spec()
    assert spec["glyph_family_id"] == COMBADGE_DELTA_V1
    graph = spec["procedural_graph"]
    assert graph.get("envelope_id") == "ghost_shield_v1"

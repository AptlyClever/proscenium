"""Hero focal floor — Phase A/C-A (pso-20260619-axiom-glyph-hero-achievement-path GHAP4)."""

from __future__ import annotations

import hashlib
from unittest.mock import patch

from hails.hail_glyph_envelope import GHOST_SHIELD_ENVELOPE_ID
from hails.hail_glyph_hero_quality import (
    verify_glyph_spec_hero_quality,
    verify_procedural_graph_hero_focal_floor,
)
from hails.hail_glyph_procedural import PROCEDURAL_GRAPH_VERSION, generate_procedural_graph
from hails.hails_composer import seed_glyph_spec


def _digest(*parts: str) -> bytes:
    return hashlib.sha256("|".join(parts).encode("utf-8")).digest()


def test_slot_band_ray_fails_hero_focal_floor() -> None:
    """Thin band+ray recipes remain below floor until a later C-A slice."""
    graph, _bucket = generate_procedural_graph(
        glyph_name="Hero",
        hail_name="",
        seed=7,
        digest=_digest("hero", "floor"),
        glyph_family_id="slot_band_ray",
        variation_only=True,
    )
    errors = verify_procedural_graph_hero_focal_floor(graph)
    assert errors
    assert any("below hero optical floor" in err for err in errors)


def test_slot_orb_star_passes_hero_focal_floor() -> None:
    graph, _bucket = generate_procedural_graph(
        glyph_name="Hero",
        hail_name="",
        seed=1,
        digest=_digest("hero", "floor"),
        glyph_family_id="slot_orb_star",
        variation_only=True,
    )
    assert verify_procedural_graph_hero_focal_floor(graph) == []


def test_focal_floor_passes_when_normalized_ink_meets_threshold() -> None:
    graph = {
        "version": PROCEDURAL_GRAPH_VERSION,
        "generator_id": "slot_test_fixture",
        "paths": [
            {
                "d": "M13 13 H35 V35 H13 Z",
                "stroke": "currentColor",
                "stroke_width": 2.5,
                "fill": "currentColor",
                "opacity": 1.0,
            },
            {
                "d": "M18 24 H30",
                "stroke": "currentColor",
                "stroke_width": 2.5,
                "opacity": 0.6,
            },
        ],
        "circles": [],
        "signature": "floor-pass-fixture",
    }
    normalized = {
        **graph,
        "envelope_id": GHOST_SHIELD_ENVELOPE_ID,
    }
    metrics = {
        "width": 22.0,
        "height": 20.0,
        "centroid_x": 24.0,
        "centroid_y": 24.0,
        "point_count": 8.0,
    }
    with patch(
        "hails.hail_glyph_hero_quality.normalize_procedural_graph_envelope",
        return_value=normalized,
    ), patch(
        "hails.hail_glyph_hero_quality.measure_glyph_content_metrics",
        return_value=metrics,
    ):
        assert verify_procedural_graph_hero_focal_floor(graph) == []


def test_glyph_spec_hero_quality_passes_for_phase_c_catalog_family() -> None:
    graph, _bucket = generate_procedural_graph(
        glyph_name="Hero",
        hail_name="",
        seed=7,
        digest=_digest("hero", "spec-floor"),
        glyph_family_id="slot_shield_chevron",
        variation_only=True,
    )
    spec = {
        "glyph_id": "custom-floor-test",
        "procedural_graph": graph,
        "glyph_family_id": graph.get("generator_id"),
    }
    assert verify_glyph_spec_hero_quality(spec) == []


def test_seed_glyph_spec_passes_hero_focal_floor() -> None:
    spec = seed_glyph_spec(glyph_name="Hero Seed", seed=1)
    assert spec.get("glyph_family_id")
    assert verify_procedural_graph_hero_focal_floor(spec["procedural_graph"]) == []

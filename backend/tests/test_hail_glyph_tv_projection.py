"""Tests for Google TV procedural graph projection."""

from __future__ import annotations

import hashlib

from hails.hail_glyph_hero_quality import verify_procedural_graph_castable_lead
from hails.hail_glyph_procedural import generate_procedural_graph
from hails.hail_glyph_tv_projection import (
    GOOGLE_TV_PROJECTION_ID,
    project_procedural_graph_for_google_tv,
)
from hails.hails_glyph_render import resolve_glyph_render


def test_project_procedural_graph_converts_circles_to_paths() -> None:
    canonical = {
        "version": 1,
        "signature": "probe-circles-v1",
        "paths": [
            {"d": "M24 12 L34 34", "stroke_width": 2.5, "opacity": 1.0, "fill": "none"},
        ],
        "circles": [
            {"cx": 20, "cy": 22, "r": 2.5, "fill": "currentColor", "opacity": 0.9},
        ],
    }
    projected = project_procedural_graph_for_google_tv(canonical)
    assert projected["signature"] == "probe-circles-v1-tv"
    assert len(projected["paths"]) == 2
    assert "circles" not in projected
    assert projected["paths"][1]["fill"] == "currentColor"


def test_resolve_glyph_render_tv_vs_authoring() -> None:
    canonical = {
        "version": 1,
        "signature": "hero-v1",
        "paths": [{"d": "M10 10 L30 30", "stroke_width": 2.5, "opacity": 1.0}],
        "circles": [{"cx": 24, "cy": 24, "r": 2, "opacity": 0.9}],
    }
    library = {"custom-hero": {"glyph_id": "custom-hero", "procedural_graph": canonical}}

    authoring = resolve_glyph_render(
        "custom-hero",
        custom_glyphs=library,
        consumer_id="axiom_authoring",
    )
    tv = resolve_glyph_render(
        "custom-hero",
        custom_glyphs=library,
        consumer_id="google_tv_apk",
    )

    assert authoring["representation"] == "canonical"
    assert authoring["procedural_graph"]["circles"]
    assert tv["representation"] == "projected"
    assert tv["projection_id"] == GOOGLE_TV_PROJECTION_ID
    assert tv["source_signature"] == "hero-v1"
    assert "circles" not in tv["procedural_graph"]
    assert len(tv["procedural_graph"]["paths"]) == 2


def test_projected_tv_graph_passes_castable_lead() -> None:
    graph, _ = generate_procedural_graph(
        glyph_name="TV parity",
        hail_name="",
        seed=11,
        digest=hashlib.sha256(b"tv-parity").digest(),
    )
    projected = project_procedural_graph_for_google_tv(graph)
    errors = verify_procedural_graph_castable_lead(projected)
    assert errors == [], f"TV projection must stay castable-lead: {errors}"

"""North-star Hero Glyph proof — chunky round guardian."""

from __future__ import annotations

import hashlib

from hails.hail_glyph_character import (
    HERO_GLYPH_PROOF_FAMILY_ID,
    HERO_GLYPH_PROOF_GLYPH_ID,
    HERO_GLYPH_PROOF_LEAD_PHRASE,
    build_hero_glyph_proof_spec,
    render_character_recipe,
)
from hails.hail_glyph_hero_quality import (
    assert_enriched_package_hero_quality,
    verify_dual_profile_castable_lead,
    verify_glyph_spec_hero_quality,
    verify_procedural_graph_castable_lead,
)
from hails.hail_glyph_procedural import _GlyphRng, generate_procedural_graph
from hails.hail_package_v2 import enrich_consumer_render_payload_v2
from hails.hails_hero_glyph_proof import hero_glyph_proof_custom_glyphs, upsert_hero_glyph_proof_hail
from hails.hails_render_contract import build_consumer_render_payload


def _digest(*parts: str) -> bytes:
    return hashlib.sha256("|".join(parts).encode("utf-8")).digest()


def test_proof_character_metadata() -> None:
    rng = _GlyphRng(_digest("hero", "proof"), seed=1)
    _paths, _circles, composition = render_character_recipe(
        HERO_GLYPH_PROOF_FAMILY_ID,
        rng,
        variation_only=False,
    )
    assert composition["schema"] == "char_v1"
    assert composition["lead_phrase"] == HERO_GLYPH_PROOF_LEAD_PHRASE
    assert composition["character_type"] == "mascot-character"


def test_proof_graph_passes_castable_lead() -> None:
    graph, _bucket = generate_procedural_graph(
        glyph_name="Guardian",
        hail_name="",
        seed=424242,
        digest=_digest("hero", "proof"),
        glyph_family_id=HERO_GLYPH_PROOF_FAMILY_ID,
        variation_only=True,
    )
    assert graph["generator_id"] == HERO_GLYPH_PROOF_FAMILY_ID
    assert verify_procedural_graph_castable_lead(graph) == []
    assert verify_dual_profile_castable_lead(graph) == []
    from hails.hail_glyph_envelope import measure_glyph_content_metrics

    metrics = measure_glyph_content_metrics(graph["paths"], graph.get("circles") or [])
    assert metrics["height"] >= 14.0, f"hero ink too small after envelope: {metrics}"
    assert metrics["width"] >= 14.0, f"hero ink too narrow after envelope: {metrics}"


def test_proof_spec_passes_hero_quality() -> None:
    spec = build_hero_glyph_proof_spec()
    assert spec["glyph_id"] == HERO_GLYPH_PROOF_GLYPH_ID
    assert verify_glyph_spec_hero_quality(spec) == []


def test_proof_hail_enriched_package_passes_hero_gate() -> None:
    glyphs = hero_glyph_proof_custom_glyphs()
    record, _action = upsert_hero_glyph_proof_hail([], custom_glyphs=glyphs)
    base = build_consumer_render_payload(record, custom_glyphs=glyphs)
    enriched = enrich_consumer_render_payload_v2(base, record, custom_glyphs=glyphs)
    assert_enriched_package_hero_quality(enriched, hail_record=record, custom_glyphs=glyphs)
    glyph_render = enriched.get("glyph_render") or {}
    assert glyph_render.get("kind") == "procedural"
    assert glyph_render.get("procedural_graph", {}).get("generator_id") == HERO_GLYPH_PROOF_FAMILY_ID

"""E3 — glyph_art layout from procedural ink bounds."""

from __future__ import annotations

import hashlib

from hails.hail_glyph_art_layout import (
    attach_glyph_art_to_layout_regions,
    compute_glyph_art_region,
    glyph_art_within_effect_field,
    glyph_art_within_safe_zone,
    validate_glyph_art_regions,
)
from hails.hail_glyph_procedural import generate_procedural_graph
from hails.hail_package_v2 import enrich_consumer_render_payload_v2
from hails.hail_paintbox_layout import compute_hail_layout_regions
from hails.hails_render_contract import build_consumer_render_payload


def _digest(name: str) -> bytes:
    return hashlib.sha256(name.encode()).digest()


def _procedural_hail(**overrides) -> tuple[dict, dict]:
    graph, _ = generate_procedural_graph(
        glyph_name="Card Trick",
        hail_name="",
        seed=42,
        digest=_digest("card-trick"),
    )
    hail = {
        "id": "hail.glyph_art.001",
        "name": "Glyph art",
        "enabled": True,
        "icon": {"value": "custom-card-trick"},
        "message": {"short_text": "E3"},
        "visual": {
            "effect_id": "transporter",
            "effect_variation_id": "voyaging",
            "scale": "medium",
            "placement_id": "upper_center",
            "palette_id": "axiom_dark_cyan",
            "duration_ms": 5000,
        },
    }
    hail.update(overrides)
    custom = {"custom-card-trick": {"glyph_id": "custom-card-trick", "procedural_graph": graph}}
    return hail, custom


def test_compute_glyph_art_smaller_than_effect_field() -> None:
    regions = compute_hail_layout_regions(614.4, 367.2, {"messageWeight": 0.28})
    hail, custom = _procedural_hail()
    base = build_consumer_render_payload(hail, custom_glyphs=custom)
    glyph_art = compute_glyph_art_region(
        glyph_render=base["glyph_render"],
        glyph_focus=regions["glyph_focus"],
        effect_field=regions["effect_field"],
    )
    assert glyph_art is not None
    assert glyph_art["width"] < regions["effect_field"]["width"]
    assert glyph_art["width"] < regions["glyph_focus"]["width"]
    assert glyph_art_within_effect_field(glyph_art, regions["effect_field"])
    assert glyph_art_within_safe_zone(glyph_art, regions["safe_zone"])


def test_registry_glyph_omits_glyph_art() -> None:
    regions = compute_hail_layout_regions(614.4, 367.2, {"messageWeight": 0.28})
    out = attach_glyph_art_to_layout_regions(regions, {"kind": "registry", "glyph_id": "default"})
    assert "glyph_art" not in out


def test_enrich_payload_attaches_glyph_art_for_procedural() -> None:
    hail, custom = _procedural_hail()
    payload = enrich_consumer_render_payload_v2(
        build_consumer_render_payload(hail, custom_glyphs=custom),
        hail,
        custom_glyphs=custom,
    )
    glyph_art = payload["layout_regions"].get("glyph_art")
    assert isinstance(glyph_art, dict)
    effect = payload["layout_regions"]["effect_field"]
    assert glyph_art["width"] < effect["width"]
    assert validate_glyph_art_regions(payload["layout_regions"]) == []


def test_validate_rejects_glyph_art_outside_effect_field() -> None:
    hail, custom = _procedural_hail()
    payload = enrich_consumer_render_payload_v2(
        build_consumer_render_payload(hail, custom_glyphs=custom),
        hail,
        custom_glyphs=custom,
    )
    payload["layout_regions"] = dict(payload["layout_regions"])
    payload["layout_regions"]["glyph_art"] = {
        "left": 0.0,
        "top": 0.0,
        "width": 500.0,
        "height": 500.0,
        "center_x": 250.0,
        "center_y": 250.0,
    }
    errors = validate_glyph_art_regions(payload["layout_regions"])
    assert any("effect_field" in e["message"] for e in errors)

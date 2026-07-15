"""Tests for presentation overlay framework (6c)."""

from __future__ import annotations

from hails.hail_presentation_overlay import (
    build_presentation_overlay_entity,
    presentation_overlay_exists,
    validate_presentation_overlay,
)


def test_css_burst_overlay_entity() -> None:
    entity = build_presentation_overlay_entity(
        {
            "kind": "css_burst",
            "css_profile": "spark_radial_v1",
            "anchor": "effect_field",
            "start_anchor": "glyphImpactPeak",
            "android": "deferred",
        }
    )
    assert entity is not None
    assert entity["kind"] == "css_burst"
    assert entity["android"] == "deferred"


def test_lottie_overlay_requires_existing_asset() -> None:
    errors = validate_presentation_overlay(
        {
            "kind": "lottie",
            "asset_ref": "missing.json",
            "anchor": "glyph_focus",
            "start_anchor": "glyphLockIn",
        }
    )
    assert any("not found" in row for row in errors)


def test_lottie_placeholder_overlay_exists() -> None:
    assert presentation_overlay_exists("spark-burst-placeholder.json")
    entity = build_presentation_overlay_entity(
        {
            "kind": "lottie",
            "asset_ref": "spark-burst-placeholder.json",
            "anchor": "effect_field",
            "start_anchor": "glyphImpactPeak",
            "android": "deferred",
        }
    )
    assert entity is not None
    assert entity["asset_url"].endswith("spark-burst-placeholder.json")

"""Hero Glyph quality gates on enriched packages."""

from __future__ import annotations

import copy
from datetime import datetime, timezone

from hails.hail_glyph_hero_quality import (
    assert_enriched_package_hero_quality,
    hero_quality_validation_errors,
    verify_enriched_package_hero_quality,
    verify_glyph_spec_hero_quality,
    verify_glyph_thumbnail_distinctiveness,
)
from hails.hail_package_v2 import enrich_consumer_render_payload_v2
from hails.hails_composer import build_fixture_glyph_spec, seed_glyph_spec, ComposerValidationError
from hails.hails_platform_test import (
    PLATFORM_TEST_GLYPH_FAMILY,
    PLATFORM_TEST_GLYPH_ID,
    build_platform_test_glyph_spec,
    platform_test_custom_glyphs,
    upsert_platform_test_hail,
)
from hails.hails_render_contract import build_consumer_render_payload


def test_platform_test_glyph_spec_is_hero_quality() -> None:
    assert verify_glyph_spec_hero_quality(build_platform_test_glyph_spec()) == []


def test_platform_test_enriched_package_passes_hero_quality() -> None:
    glyphs = platform_test_custom_glyphs()
    record, _ = upsert_platform_test_hail([], custom_glyphs=glyphs)
    base = build_consumer_render_payload(record, custom_glyphs=glyphs)
    enriched = enrich_consumer_render_payload_v2(base, record, custom_glyphs=glyphs)
    assert verify_enriched_package_hero_quality(enriched, hail_record=record, custom_glyphs=glyphs) == []


def test_default_glyph_fails_enriched_hero_gate() -> None:
    hail = {
        "id": "hail.fixture.default",
        "message": {"short_text": "Default glyph"},
        "visual": {
            "effect_id": "transporter",
            "effect_variation_id": "voyaging",
            "scale": "medium",
            "placement_id": "upper_center",
            "placement_mode": "preset",
            "palette_id": "axiom_dark_cyan",
            "duration_ms": 5000,
        },
        "icon": {"kind": "glyph", "value": "default"},
    }
    base = build_consumer_render_payload(hail)
    enriched = enrich_consumer_render_payload_v2(base, hail)
    errors = verify_enriched_package_hero_quality(enriched)
    assert any("default" in err for err in errors)


def test_platform_test_glyph_id_stable_across_rebuilds() -> None:
    rebuilt_at = datetime(2026, 6, 18, 15, 30, tzinfo=timezone.utc)
    spec_a = build_platform_test_glyph_spec()
    spec_b = build_platform_test_glyph_spec()
    assert spec_a["glyph_id"] == PLATFORM_TEST_GLYPH_ID
    assert spec_b["glyph_id"] == PLATFORM_TEST_GLYPH_ID
    assert spec_a["procedural_graph"]["generator_id"] == PLATFORM_TEST_GLYPH_FAMILY
    glyphs = platform_test_custom_glyphs()
    record, _ = upsert_platform_test_hail([], custom_glyphs=glyphs, rebuilt_at=rebuilt_at)
    assert record["icon"]["value"] == PLATFORM_TEST_GLYPH_ID


def test_seed_glyph_spec_passes_hero_focal_floor() -> None:
    spec = seed_glyph_spec(glyph_name="Hero Gate", seed=1)
    assert spec.get("glyph_family_id")
    assert verify_glyph_spec_hero_quality(spec) == []


def test_hero_quality_validation_errors_shape() -> None:
    spec = build_fixture_glyph_spec(glyph_name="Hero Shape")
    spec["procedural_graph"]["paths"] = spec["procedural_graph"]["paths"][:1]
    errors = hero_quality_validation_errors(spec)
    assert errors
    assert all(e["path"] == "/procedural_graph" and e["message"] for e in errors)


def test_thumbnail_distinctiveness_ignores_self() -> None:
    spec = build_fixture_glyph_spec(glyph_name="Self Distinct")
    assert verify_glyph_thumbnail_distinctiveness(spec, [spec]) == []


def test_thumbnail_distinctiveness_flags_peer_collision() -> None:
    a = build_fixture_glyph_spec(glyph_name="Peer A")
    b = build_fixture_glyph_spec(glyph_name="Peer B")
    b["glyph_id"] = "custom-peer-b"
    b["procedural_graph"] = copy.deepcopy(a["procedural_graph"])
    errors = verify_glyph_thumbnail_distinctiveness(b, [a])
    assert errors
    assert "Peer A" in errors[0]

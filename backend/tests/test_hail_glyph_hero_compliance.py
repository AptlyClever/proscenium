"""Golden-path compliance — Hero Glyph doctrine is defined elsewhere; this tests the pipeline."""

from __future__ import annotations

from hails.hail_package_v2 import enrich_consumer_render_payload_v2
from hails.hails_consumer_capability import validate_hail_package_for_consumers
from hails.hails_platform_test import platform_test_custom_glyphs, upsert_platform_test_hail
from hails.hails_render_contract import build_consumer_render_payload


def test_platform_test_golden_path_passes_consumer_manifest() -> None:
    """Seed → package v2 → manifest v002 (delivery plumbing; not operator §4)."""
    glyphs = platform_test_custom_glyphs()
    record, _ = upsert_platform_test_hail([], custom_glyphs=glyphs)
    payload = build_consumer_render_payload(record, custom_glyphs=glyphs)
    enriched = enrich_consumer_render_payload_v2(payload, record, custom_glyphs=glyphs)

    assert enriched["glyph_render"]["kind"] == "procedural"
    assert isinstance(enriched.get("layout_regions"), dict)
    assert validate_hail_package_for_consumers(enriched) == []


def test_platform_test_exposes_dual_glyph_render_when_projected() -> None:
    glyphs = platform_test_custom_glyphs()
    record, _ = upsert_platform_test_hail([], custom_glyphs=glyphs)
    payload = build_consumer_render_payload(record, custom_glyphs=glyphs)
    enriched = enrich_consumer_render_payload_v2(payload, record, custom_glyphs=glyphs)

    tv = enriched.get("glyph_render") or {}
    canonical = enriched.get("glyph_render_canonical")
    assert tv.get("kind") == "procedural"
    if canonical:
        assert canonical.get("representation") == "canonical"
        assert tv.get("representation") == "projected"

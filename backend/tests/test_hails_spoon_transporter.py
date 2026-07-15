"""Spoon transporter hail upgrade tests."""

from __future__ import annotations

from hails.hail_glyph_hero_quality import verify_enriched_package_hero_quality, verify_glyph_spec_hero_quality
from hails.hail_package_v2 import enrich_consumer_render_payload_v2
from hails.hails_render_contract import build_consumer_render_payload
from hails.hails_spoon_transporter import (
    SPOON_TRANSPORTER_GLYPH_ID,
    SPOON_TRANSPORTER_HAIL_ID,
    build_spoon_transporter_glyph_spec,
    build_spoon_transporter_hail_body,
    spoon_transporter_custom_glyphs,
    upsert_spoon_transporter_hail,
)


def test_spoon_transporter_body_uses_custom_glyph() -> None:
    body = build_spoon_transporter_hail_body()
    assert body["id"] == SPOON_TRANSPORTER_HAIL_ID
    assert body["icon"]["value"] == SPOON_TRANSPORTER_GLYPH_ID
    assert body["visual"]["effect_variation_id"] == "spoon"


def test_spoon_transporter_glyph_spec_passes_hero_quality() -> None:
    assert verify_glyph_spec_hero_quality(build_spoon_transporter_glyph_spec()) == []


def test_upsert_spoon_transporter_catalog_ready() -> None:
    glyphs = spoon_transporter_custom_glyphs()
    record, action = upsert_spoon_transporter_hail([], custom_glyphs=glyphs)
    assert action == "created"
    assert record["hail_package"]["catalog_ready"] is True
    payload = build_consumer_render_payload(record, custom_glyphs=glyphs)
    assert payload["glyph_render"]["kind"] == "procedural"
    enriched = enrich_consumer_render_payload_v2(payload, record, custom_glyphs=glyphs)
    assert verify_enriched_package_hero_quality(enriched, hail_record=record, custom_glyphs=glyphs) == []

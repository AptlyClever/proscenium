"""Tests for platform Test hail builder and upsert."""

from __future__ import annotations

from datetime import datetime, timezone

from hails.hail_glyph_hero_quality import assert_enriched_package_hero_quality, verify_enriched_package_hero_quality, verify_glyph_spec_hero_quality
from hails.hail_package_v2 import enrich_consumer_render_payload_v2
from hails.hails_platform_test import (
    PLATFORM_TEST_GLYPH_ID,
    PLATFORM_TEST_HAIL_ID,
    PLATFORM_TEST_ROUTE_ID,
    build_platform_test_glyph_spec,
    build_platform_test_hail_body,
    platform_test_custom_glyphs,
    upsert_platform_test_hail,
)
from hails.hails_render_contract import build_consumer_render_payload


def test_build_body_uses_platform_test_glyph() -> None:
    body = build_platform_test_hail_body(
        rebuilt_at=datetime(2026, 6, 18, 12, 0, tzinfo=timezone.utc),
    )
    assert body["id"] == PLATFORM_TEST_HAIL_ID
    assert body["icon"]["value"] == PLATFORM_TEST_GLYPH_ID
    assert "2026-06-18 12:00 UTC" in body["message"]["short_text"]
    assert body["visual"]["priority_level"] == "green"
    assert body["delivery_policy"]["routes"][0]["id"] == PLATFORM_TEST_ROUTE_ID
    away_route = next(
        route for route in body["delivery_policy"]["routes"]
        if route["id"] == "route.arcade.away_team.001"
    )
    assert away_route["destination_room_id"] == "away_team"


def test_platform_test_glyph_spec_passes_hero_quality() -> None:
    spec = build_platform_test_glyph_spec()
    assert spec["glyph_id"] == PLATFORM_TEST_GLYPH_ID
    assert verify_glyph_spec_hero_quality(spec) == []


def test_upsert_creates_catalog_ready_hail() -> None:
    glyphs = platform_test_custom_glyphs()
    record, action = upsert_platform_test_hail([], custom_glyphs=glyphs)
    assert action == "created"
    assert record["id"] == PLATFORM_TEST_HAIL_ID
    assert record["hail_package"]["catalog_ready"] is True
    payload = build_consumer_render_payload(record, custom_glyphs=glyphs)
    assert payload.get("catalog_ready") is True
    assert payload["glyph_render"]["kind"] == "procedural"
    enriched = enrich_consumer_render_payload_v2(payload, record, custom_glyphs=glyphs)
    assert verify_enriched_package_hero_quality(enriched, hail_record=record, custom_glyphs=glyphs) == []


def test_upsert_updates_existing_id() -> None:
    glyphs = platform_test_custom_glyphs()
    created, _ = upsert_platform_test_hail([], custom_glyphs=glyphs)
    updated, action = upsert_platform_test_hail(
        [created],
        custom_glyphs=glyphs,
        rebuilt_at=datetime(2026, 6, 18, 13, 0, tzinfo=timezone.utc),
    )
    assert action == "updated"
    assert updated["id"] == PLATFORM_TEST_HAIL_ID
    assert "13:00 UTC" in updated["message"]["short_text"]
    assert updated["hail_package"]["package_version"] >= created["hail_package"]["package_version"]


def test_consumer_payload_catalog_ready() -> None:
    glyphs = platform_test_custom_glyphs()
    record, _ = upsert_platform_test_hail([], custom_glyphs=glyphs)
    payload = build_consumer_render_payload(record, custom_glyphs=glyphs)
    assert payload.get("catalog_ready") is True
    assert payload.get("palette_presentation")
    assert payload["glyph_id"] == PLATFORM_TEST_GLYPH_ID


def test_red_platform_test_hail_quick_message_entrance() -> None:
    glyphs = platform_test_custom_glyphs()
    record, _ = upsert_platform_test_hail([], custom_glyphs=glyphs, priority_level="red")
    assert record["visual"]["priority_level"] == "red"
    payload = build_consumer_render_payload(record, custom_glyphs=glyphs)
    assert payload.get("priority_level") == "red"
    assert payload.get("presentation_entity", {}).get("preset_id") == "cinematic"
    message_entity = payload.get("message_entity") or {}
    assert message_entity.get("entrance_ms") == 240
    assert message_entity.get("entrance_speed_tier") == "quick"

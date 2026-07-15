"""Away Team hail upgrade + fleet glyph audit tests."""

from __future__ import annotations

from hails.hail_fleet_glyph_audit import audit_fleet_glyph_heroes, canonical_hero_glyph_ids
from hails.hail_glyph_hero_quality import verify_enriched_package_hero_quality, verify_glyph_spec_hero_quality
from hails.hail_package_v2 import enrich_consumer_render_payload_v2
from hails.hails_away_team import (
    AWAY_TEAM_GLYPH_ID,
    AWAY_TEAM_HAIL_ID,
    away_team_custom_glyphs,
    build_away_team_glyph_spec,
    build_away_team_hail_body,
    upsert_away_team_hail,
)
from hails.hails_platform_test import (
    build_platform_test_glyph_spec,
    platform_test_custom_glyphs,
    upsert_platform_test_hail,
)
from hails.hails_render_contract import build_consumer_render_payload
from hails.hails_spoon_transporter import (
    build_spoon_transporter_glyph_spec,
    spoon_transporter_custom_glyphs,
    upsert_spoon_transporter_hail,
)


def test_away_team_body_uses_custom_glyph() -> None:
    body = build_away_team_hail_body()
    assert body["id"] == AWAY_TEAM_HAIL_ID
    assert body["icon"]["value"] == AWAY_TEAM_GLYPH_ID
    assert body["visual"]["effect_variation_id"] == "spoon"
    assert body["visual"]["priority_level"] == "yellow"


def test_away_team_glyph_passes_hero_quality() -> None:
    assert verify_glyph_spec_hero_quality(build_away_team_glyph_spec()) == []


def test_away_team_package_passes_hero_quality() -> None:
    glyphs = away_team_custom_glyphs()
    record, _ = upsert_away_team_hail([], custom_glyphs=glyphs)
    payload = build_consumer_render_payload(record, custom_glyphs=glyphs)
    enriched = enrich_consumer_render_payload_v2(payload, record, custom_glyphs=glyphs)
    assert verify_enriched_package_hero_quality(enriched, hail_record=record, custom_glyphs=glyphs) == []


def test_canonical_exemplars_have_unique_glyph_ids() -> None:
    platform = platform_test_custom_glyphs()
    spoon = spoon_transporter_custom_glyphs()
    away = away_team_custom_glyphs()
    glyph_ids = {
        platform["custom-platform-test"]["glyph_id"],
        spoon["custom-spoon-transporter"]["glyph_id"],
        away["custom-away-team"]["glyph_id"],
    }
    assert len(glyph_ids) == 3
    assert glyph_ids == canonical_hero_glyph_ids()


def test_canonical_exemplars_have_distinct_thumbnail_signatures() -> None:
    from hails.hail_glyph_hero_quality import verify_glyph_thumbnail_distinctiveness

    specs = [
        build_away_team_glyph_spec(),
        build_platform_test_glyph_spec(),
        build_spoon_transporter_glyph_spec(),
    ]
    for spec in specs:
        peers = [peer for peer in specs if peer is not spec]
        assert verify_glyph_thumbnail_distinctiveness(spec, peers) == []


def test_fleet_audit_flags_default_glyph() -> None:
    rows = audit_fleet_glyph_heroes(
        [
            {
                "id": "hail.legacy.001",
                "enabled": True,
                "archived": False,
                "icon": {"value": "default"},
            }
        ]
    )
    assert len(rows) == 1
    assert rows[0]["issue"] == "legacy_registry_glyph"


def test_fleet_audit_passes_canonical_exemplars() -> None:
    glyphs = {
        **platform_test_custom_glyphs(),
        **spoon_transporter_custom_glyphs(),
        **away_team_custom_glyphs(),
    }
    hails = [
        upsert_platform_test_hail([], custom_glyphs=glyphs)[0],
        upsert_spoon_transporter_hail([], custom_glyphs=glyphs)[0],
        upsert_away_team_hail([], custom_glyphs=glyphs)[0],
    ]
    assert audit_fleet_glyph_heroes(hails, custom_glyphs=glyphs) == []

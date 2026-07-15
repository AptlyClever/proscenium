"""Tests for Hail Package v2 and consumer capability manifest."""

from __future__ import annotations

from hails.hail_paintbox_layout import compute_hail_layout_regions, resolve_hail_package_layout
from hails.hail_package_v2 import (
    enrich_consumer_render_payload_v2,
    validate_hail_record_for_save,
)
from hails.hails_message_sidekick import build_message_entity
from hails.hails_consumer_capability import (
    PACKAGE_SCHEMA_VERSION,
    load_consumer_capability_manifest,
    validate_hail_package_for_consumers,
)
from hails.hails_render_contract import build_consumer_render_payload, load_hail_render_contract


def _sample_hail(**overrides) -> dict:
    hail = {
        "id": "hail.beta.001",
        "name": "Beta hail",
        "enabled": True,
        "icon": {"value": "default"},
        "message": {"short_text": "Hello TV"},
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
    return hail


def test_manifest_loads_v002() -> None:
    doc = load_consumer_capability_manifest()
    assert doc["manifest_id"] == "consumer-capability-manifest.v002"
    assert doc["package_schema_version"] == PACKAGE_SCHEMA_VERSION


def test_layout_regions_match_lcard_shape() -> None:
    contract = load_hail_render_contract()
    layout = resolve_hail_package_layout(
        placement_id="upper_center",
        placement_mode="preset",
        size_tier="medium",
        contract=contract,
    )
    regions = layout["layout_regions"]
    safe_cy = regions["safe_zone"]["top"] + regions["safe_zone"]["height"] / 2
    assert regions["glyph_focus"]["center_x"] > 0
    assert abs(regions["glyph_focus"]["center_y"] - safe_cy) < 0.01
    assert regions["effect_field"]["width"] >= regions["glyph_focus"]["width"]
    assert regions["transporter_beam_envelope"]["width"] == regions["effect_field"]["width"]
    assert regions["message_band"]["top"] >= regions["glyph_focus"]["top"]
    assert regions["message_band"]["left"] == regions["glyph_focus"]["left"]
    assert regions["message_band"]["width"] == regions["glyph_focus"]["width"]


def test_compute_hail_layout_regions_message_band() -> None:
    regions = compute_hail_layout_regions(640, 360, {"messageWeight": 0.36})
    assert regions["message_band"]["height"] > 0


def test_enrich_payload_adds_package_schema_v2() -> None:
    hail = _sample_hail()
    base = build_consumer_render_payload(hail)
    payload = enrich_consumer_render_payload_v2(base, hail)
    assert payload["package_schema_version"] == 2
    assert payload["catalog_ready"] is True
    assert isinstance(payload["message_entity"], dict)
    assert payload["message_entity"]["text"] == "Hello TV"
    assert payload["layout_regions"]["glyph_focus"]


def test_message_entity_stable_phase_fields() -> None:
    hail = _sample_hail(
        visual={
            **_sample_hail()["visual"],
            "message_tuning": {"entrance_speed_tier": "quick"},
        }
    )
    entity = build_message_entity(hail, stable_hold_ms=5000)
    assert entity["entrance_speed_tier"] == "quick"
    assert entity["entrance_ms"] == 240
    assert entity["entrance_offset_ms"] == 0


def test_validate_rejects_pop_effect() -> None:
    hail = _sample_hail(visual={**_sample_hail()["visual"], "effect_id": "pop"})
    payload = build_consumer_render_payload(hail)
    errors = validate_hail_package_for_consumers(payload)
    assert any("effect" in e["message"] for e in errors)


def test_validate_rejects_emoji_fallback() -> None:
    payload = {
        "package_schema_version": 2,
        "effect_id": "transporter",
        "size_tier": "medium",
        "placement_id": "upper_center",
        "glyph_render": {"kind": "emoji_fallback", "google_tv_deliverable": False},
        "message": "x",
        "layout_regions": {"glyph_focus": {}},
    }
    errors = validate_hail_package_for_consumers(payload)
    assert any(e["path"] == "/glyph_render" for e in errors)


def test_validate_rejects_stale_layout_regions() -> None:
    hail = _sample_hail()
    payload = enrich_consumer_render_payload_v2(build_consumer_render_payload(hail), hail)
    payload["layout_regions"] = dict(payload["layout_regions"])
    payload["layout_regions"]["glyph_focus"] = {
        "left": 0.0,
        "top": 0.0,
        "width": 1.0,
        "height": 1.0,
        "center_x": 0.5,
        "center_y": 0.5,
    }
    errors = validate_hail_package_for_consumers(payload)
    assert any("B6 parity" in e["message"] for e in errors)


def test_validate_rejects_wrong_layout_contract_version() -> None:
    hail = _sample_hail()
    payload = enrich_consumer_render_payload_v2(build_consumer_render_payload(hail), hail)
    payload["layout_contract_version"] = "v001-integration"
    errors = validate_hail_package_for_consumers(payload)
    assert any(e["path"] == "/layout_contract_version" for e in errors)


def test_validate_hail_record_for_save_transporter_passes() -> None:
    hail = _sample_hail()
    payload = build_consumer_render_payload(hail)
    assert validate_hail_record_for_save(hail, payload) == []

"""Tests for palette-backed TV presentation projection."""

from __future__ import annotations

from hails.hail_package_v2 import enrich_consumer_render_payload_v2
from hails.hails_palette_presentation import mix_hex_colors, resolve_palette_presentation
from hails.hails_render_contract import build_consumer_render_payload, load_hail_render_contract


def test_resolve_palette_presentation_from_contract() -> None:
    doc = load_hail_render_contract()
    pres = resolve_palette_presentation("axiom_dark_cyan", doc)
    assert pres["backdrop_tint"] == "#0A2E24"
    assert pres["message_backing"] == "#121618"
    assert pres["message_backing_opacity"] == 0.5
    assert pres["package_scrim_opacity"] == 0.2


def test_consumer_payload_includes_palette_presentation() -> None:
    hail = {
        "id": "hail.tv.001",
        "message": {"short_text": "Dinner!"},
        "visual": {
            "effect_id": "transporter",
            "scale": "medium",
            "placement_id": "upper_center",
            "palette_id": "cute_purple",
            "duration_ms": 5000,
        },
    }
    payload = enrich_consumer_render_payload_v2(build_consumer_render_payload(hail), hail)
    pres = payload.get("palette_presentation")
    assert isinstance(pres, dict)
    assert pres["palette_id"] == "cute_purple"
    assert pres["backdrop_tint"] == "#2E1048"
    assert pres["message_backing"] == "#140A1C"
    assert pres["package_scrim_opacity"] == 0.2


def test_consumer_payload_applies_package_accent_wash() -> None:
    hail = {
        "id": "hail.tv.002",
        "message": {"short_text": "Wash test"},
        "visual": {
            "effect_id": "transporter",
            "scale": "medium",
            "placement_id": "upper_center",
            "palette_id": "cute_purple",
            "duration_ms": 5000,
            "accent_wash": {
                "accent": "#22E870",
                "scrim_weight": 0.46,
                "plate_weight": 0.56,
            },
        },
    }
    payload = enrich_consumer_render_payload_v2(build_consumer_render_payload(hail), hail)
    pres = payload.get("palette_presentation")
    assert isinstance(pres, dict)
    assert pres["backdrop_tint"] == mix_hex_colors("#2E1048", "#22E870", 0.46)
    assert pres["message_backing"] == mix_hex_colors("#140A1C", "#22E870", 0.56)

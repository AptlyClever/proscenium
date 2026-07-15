"""Tests for priority-driven TV presentation registry (Phase B)."""

from __future__ import annotations

from hails.hail_package_v2 import enrich_consumer_render_payload_v2
from hails.hails_presentation_registry import (
    build_presentation_entity,
    default_preset_for_priority,
    resolve_presentation_preset_id,
)
from hails.hails_render_contract import build_consumer_render_payload, load_hail_render_contract


def _hail(*, priority: str = "green", preset: str | None = None) -> dict:
    visual: dict = {
        "effect_id": "transporter",
        "scale": "medium",
        "placement_id": "upper_center",
        "palette_id": "axiom_dark_cyan",
        "duration_ms": 5000,
        "priority_level": priority,
    }
    if preset:
        visual["presentation_preset_id"] = preset
    return {
        "id": "hail.pres.test.001",
        "message": {"short_text": "Test"},
        "visual": visual,
    }


def test_default_preset_by_priority() -> None:
    from hails.hails_render_contract import load_hail_render_contract_for_generation

    doc = load_hail_render_contract_for_generation("v002-beta")
    assert default_preset_for_priority("green", doc) == "operational"
    assert default_preset_for_priority("yellow", doc) == "card_lift"
    assert default_preset_for_priority("red", doc) == "cinematic"


def test_presentation_override_wins_over_priority() -> None:
    hail = _hail(priority="red", preset="operational")
    assert resolve_presentation_preset_id(hail) == "operational"
    entity = build_presentation_entity(hail)
    assert entity["resolved_from_priority"] is False


def test_consumer_payload_applies_red_cinematic_modifiers() -> None:
    hail = _hail(priority="red")
    payload = enrich_consumer_render_payload_v2(build_consumer_render_payload(hail), hail)
    entity = payload["presentation_entity"]
    assert entity["preset_id"] == "cinematic"
    assert entity["priority_level"] == "red"
    pres = payload["palette_presentation"]
    assert pres["package_scrim_opacity"] == 0.34
    assert pres["message_backing_opacity"] == 0.78
    assert pres["rim_glow_alpha"] == 0.2
    assert payload["android_effect_tuning"]["beam_intensity"] >= 0.89


def test_green_payload_friendly_operational_scrim() -> None:
    hail = _hail(priority="green")
    payload = enrich_consumer_render_payload_v2(build_consumer_render_payload(hail), hail)
    pres = payload["palette_presentation"]
    assert pres["package_scrim_opacity"] == 0.2
    assert pres["message_backing_opacity"] == 0.5
    assert pres["rim_glow_alpha"] == 0.06
    assert payload["presentation_entity"]["preset_id"] == "operational"


def test_yellow_payload_card_lift_rim() -> None:
    hail = _hail(priority="yellow")
    payload = enrich_consumer_render_payload_v2(build_consumer_render_payload(hail), hail)
    pres = payload["palette_presentation"]
    assert pres["package_scrim_opacity"] == 0.26
    assert pres["rim_glow_alpha"] == 0.14
    assert payload["presentation_entity"]["preset_id"] == "card_lift"

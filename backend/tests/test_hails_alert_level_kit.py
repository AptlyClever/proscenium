"""Tests for Alert Level kits."""

from __future__ import annotations

from hails.hails_alert_level_kit import (
    build_kit_summary,
    kit_message_tuning_defaults,
    kit_presentation_preset_id,
)
from hails.hails_message_sidekick import build_message_entity, resolve_effective_message_tuning
from hails.hails_presentation_registry import default_preset_for_priority
from hails.hails_render_contract import build_consumer_render_payload


def _sample_hail(**visual_overrides) -> dict:
    visual = {
        "effect_id": "transporter",
        "effect_variation_id": "voyaging",
        "scale": "medium",
        "placement_id": "upper_center",
        "palette_id": "axiom_dark_cyan",
        "duration_ms": 5000,
        "priority_level": "green",
    }
    visual.update(visual_overrides)
    return {
        "id": "hail.kit.001",
        "message": {"short_text": "Kit test"},
        "visual": visual,
    }


def test_kit_presets_per_alert_level() -> None:
    assert kit_presentation_preset_id("green") == "operational"
    assert kit_presentation_preset_id("yellow") == "card_lift"
    assert kit_presentation_preset_id("red") == "cinematic"
    assert default_preset_for_priority("red") == "cinematic"


def test_red_kit_quick_message() -> None:
    assert kit_message_tuning_defaults("red") == {"entrance_speed_tier": "quick"}
    hail = _sample_hail(
        priority_level="red",
        message_tuning={"entrance_speed_tier": "normal", "exit_speed_tier": "normal", "opacity": 0.92},
    )
    tuning = resolve_effective_message_tuning(hail["visual"], "secondary_fade")
    assert tuning["entrance_speed_tier"] == "quick"
    entity = build_message_entity(hail, stable_hold_ms=5000)
    assert entity["entrance_ms"] == 240


def test_build_kit_summary_red() -> None:
    summary = build_kit_summary("red")
    assert summary["presentation_preset_id"] == "cinematic"
    assert summary["message_entrance_speed_tier"] == "quick"
    assert summary["message_entrance_label"] == "Quick"


def test_red_consumer_payload_uses_kit() -> None:
    payload = build_consumer_render_payload(_sample_hail(priority_level="red"))
    assert payload["presentation_entity"]["preset_id"] == "cinematic"
    assert payload["message_entity"]["entrance_speed_tier"] == "quick"
    pres = payload.get("palette_presentation")
    assert isinstance(pres, dict)
    assert pres["palette_id"] == "axiom_dark_cyan"
    assert pres["backdrop_tint"] == "#0A2E24"


def test_mix_hex_colors_endpoints() -> None:
    from hails.hails_palette_presentation import mix_hex_colors

    assert mix_hex_colors("#000000", "#FFFFFF", 0) == "#000000"
    assert mix_hex_colors("#000000", "#FFFFFF", 1) == "#ffffff"

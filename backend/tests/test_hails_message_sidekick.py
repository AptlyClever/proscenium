"""Tests for Message Sidekick registry."""

from __future__ import annotations

from hails.hail_package_v2 import enrich_consumer_render_payload_v2
from hails.hails_message_sidekick import (
    build_message_entity,
    default_message_sidekick_id,
    message_registry_for_api,
    resolve_effective_message_tuning,
    resolve_message_sidekick_identity,
)
from hails.hails_render_contract import build_consumer_render_payload, load_hail_render_contract


def _sample_hail(**overrides) -> dict:
    hail = {
        "id": "hail.msg.001",
        "name": "Message hail",
        "enabled": True,
        "icon": {"value": "default"},
        "message": {"short_text": "Stable phase copy"},
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


def test_message_registry_loads_from_contract() -> None:
    registry = message_registry_for_api()
    assert registry["default_sidekick_id"] == "secondary_fade"
    assert len(registry["entries"]) >= 1
    tiers = registry["speed_tiers"]
    assert tiers["quick"]["entrance_ms"] == 240


def test_build_message_entity_stable_phase_timing() -> None:
    hail = _sample_hail(
        visual={
            **_sample_hail()["visual"],
            "message_sidekick_id": "secondary_fade",
            "message_tuning": {"entrance_speed_tier": "quick", "exit_speed_tier": "slow"},
        }
    )
    entity = build_message_entity(hail, stable_hold_ms=5000)
    assert entity["sidekick_id"] == "secondary_fade"
    assert entity["entrance_ms"] == 240
    assert entity["exit_ms"] == 540
    assert entity["entrance_offset_ms"] == 0
    assert entity["exit_offset_ms"] == 5000 - 540
    assert entity["opacity"] == 0.92
    assert "reveal_delay_ms" not in entity


def test_compose_payload_includes_message_sidekick() -> None:
    hail = _sample_hail()
    payload = build_consumer_render_payload(hail)
    entity = payload["message_entity"]
    assert entity["text"] == "Stable phase copy"
    assert payload["message_sidekick_id"] == default_message_sidekick_id()
    assert payload["message_identity"]["entrance_speed_tier"] == "normal"


def test_red_priority_defaults_quick_message_entrance() -> None:
    hail = _sample_hail(visual={**_sample_hail()["visual"], "priority_level": "red"})
    entity = build_message_entity(hail, stable_hold_ms=5000)
    assert entity["entrance_ms"] == 240
    assert entity["entrance_speed_tier"] == "quick"
    payload = build_consumer_render_payload(hail)
    assert payload["message_entity"]["entrance_ms"] == 240


def test_explicit_message_tuning_overrides_priority_defaults() -> None:
    hail = _sample_hail(
        visual={
            **_sample_hail()["visual"],
            "priority_level": "red",
            "message_tuning": {"entrance_speed_tier": "slow"},
        }
    )
    entity = build_message_entity(hail, stable_hold_ms=5000)
    assert entity["entrance_ms"] == 720
    assert entity["entrance_speed_tier"] == "slow"


def test_domain_filled_defaults_do_not_block_red_quick_entrance() -> None:
    hail = _sample_hail(
        visual={
            **_sample_hail()["visual"],
            "priority_level": "red",
            "message_tuning": {
                "entrance_speed_tier": "normal",
                "exit_speed_tier": "normal",
                "opacity": 0.92,
            },
        }
    )
    tuning = resolve_effective_message_tuning(hail["visual"], default_message_sidekick_id())
    assert tuning["entrance_speed_tier"] == "quick"
    entity = build_message_entity(hail, stable_hold_ms=5000)
    assert entity["entrance_ms"] == 240


def test_whisper_sidekick_defaults() -> None:
    identity = resolve_message_sidekick_identity("whisper", None)
    assert identity["entrance_speed_tier"] == "slow"
    assert identity["opacity"] == 0.78


def test_message_tuning_opacity_clamped() -> None:
    identity = resolve_message_sidekick_identity(
        "secondary_fade",
        {"opacity": 0.05, "entrance_speed_tier": "normal"},
    )
    assert identity["opacity"] == 0.2


def test_domain_normalized_persists_message_sidekick() -> None:
    from hails.hails_domain import _normalized

    merged = _normalized(
        {
            "visual": {
                "message_sidekick_id": "whisper",
                "message_tuning": {"opacity": 0.05, "entrance_speed_tier": "quick"},
            }
        },
        {},
    )
    visual = merged["visual"]
    assert visual["message_sidekick_id"] == "whisper"
    assert visual["message_tuning"]["opacity"] == 0.2
    assert visual["message_tuning"]["entrance_speed_tier"] == "quick"

"""Phase III — stable-phase hero-led interest."""

from __future__ import annotations

from hails.hail_package_v2 import enrich_consumer_render_payload_v2
from hails.hails_render_contract import build_consumer_render_payload


def _hail(priority: str) -> dict:
    return {
        "id": f"hail.stable.{priority}.001",
        "message": {"short_text": f"Stable {priority}"},
        "visual": {
            "effect_id": "transporter",
            "effect_variation_id": "voyaging",
            "scale": "medium",
            "placement_id": "upper_center",
            "palette_id": "axiom_dark_cyan",
            "duration_ms": 5000,
            "priority_level": priority,
        },
    }


def test_transporter_payload_includes_stable_interest() -> None:
    payload = enrich_consumer_render_payload_v2(
        build_consumer_render_payload(_hail("yellow")),
        _hail("yellow"),
    )
    interest = payload.get("stable_interest")
    assert isinstance(interest, dict)
    assert interest["stable_residual"] == "optional_glyph_local"
    assert interest["glyph_breathe_amplitude"] == 0.06
    assert interest["glyph_shimmer_intensity"] > 0.32
    assert interest["stable_rim_pulse_ms"] == 420
    assert interest["rim_pulse_enabled"] is True


def test_green_stable_interest_no_rim_pulse() -> None:
    green_payload = enrich_consumer_render_payload_v2(
        build_consumer_render_payload(_hail("green")),
        _hail("green"),
    )
    green = green_payload["stable_interest"]
    assert green["rim_pulse_enabled"] is False
    red = enrich_consumer_render_payload_v2(
        build_consumer_render_payload(_hail("red")),
        _hail("red"),
    )["stable_interest"]
    assert green["glyph_shimmer_intensity"] < red["glyph_shimmer_intensity"]
    assert red["rim_pulse_enabled"] is True


def test_message_entity_stable_phase_sidekick() -> None:
    payload = enrich_consumer_render_payload_v2(
        build_consumer_render_payload(_hail("green")),
        _hail("green"),
    )
    entity = payload["message_entity"]
    assert entity.get("entrance_ms", 0) >= 80
    assert entity.get("stable_hold_ms", payload["duration_ms"]) == payload["duration_ms"]

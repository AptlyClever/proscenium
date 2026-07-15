"""Phase I — presentation Kit parity across priority levels."""

from __future__ import annotations

from hails.hail_package_v2 import enrich_consumer_render_payload_v2
from hails.hails_render_contract import build_consumer_render_payload


def _hail(priority: str) -> dict:
    return {
        "id": f"hail.kit.{priority}.001",
        "message": {"short_text": f"Kit {priority}"},
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


def test_priority_kit_scrim_ladder() -> None:
    green = enrich_consumer_render_payload_v2(
        build_consumer_render_payload(_hail("green")),
        _hail("green"),
    )["palette_presentation"]
    yellow = enrich_consumer_render_payload_v2(
        build_consumer_render_payload(_hail("yellow")),
        _hail("yellow"),
    )["palette_presentation"]
    red = enrich_consumer_render_payload_v2(
        build_consumer_render_payload(_hail("red")),
        _hail("red"),
    )["palette_presentation"]

    assert green["package_scrim_opacity"] < yellow["package_scrim_opacity"] < red["package_scrim_opacity"]
    assert green["message_backing_opacity"] < yellow["message_backing_opacity"] < red["message_backing_opacity"]
    assert green["rim_glow_alpha"] < yellow["rim_glow_alpha"] <= red["rim_glow_alpha"]


def test_red_entrance_presence_scales_beam_not_stable_scrim() -> None:
    payload = enrich_consumer_render_payload_v2(
        build_consumer_render_payload(_hail("red")),
        _hail("red"),
    )
    pres = payload["palette_presentation"]
    tuning = payload["android_effect_tuning"]
    assert pres["entrance_presence_scale"] == 1.18
    assert float(tuning["beam_intensity"]) > 0.85
    assert pres["package_scrim_opacity"] == 0.34

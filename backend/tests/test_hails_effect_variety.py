"""Step 15 — effect variety (pop on Google TV APK)."""

from __future__ import annotations

from hails.hail_package_v2 import enrich_consumer_render_payload_v2, map_axiom_effect_to_overlay_effect
from hails.hails_consumer_capability import validate_hail_package_for_consumers
from hails.hails_render_contract import build_consumer_render_payload


def _hail(effect_id: str = "pop") -> dict:
    return {
        "id": "hail.pop.green.001",
        "message": {"short_text": "Green ping"},
        "visual": {
            "effect_id": effect_id,
            "scale": "medium",
            "placement_id": "upper_center",
            "palette_id": "axiom_dark_cyan",
            "duration_ms": 5000,
            "priority_level": "green",
        },
    }


def test_pop_is_deliverable_on_google_tv() -> None:
    payload = enrich_consumer_render_payload_v2(
        build_consumer_render_payload(_hail("pop")),
        _hail("pop"),
    )
    errors = validate_hail_package_for_consumers(payload)
    assert errors == []
    assert payload["effect_id"] == "pop"


def test_pop_maps_to_overlay_effect_id() -> None:
    assert map_axiom_effect_to_overlay_effect("pop") == "pop"


def test_pop_payload_omits_stable_interest() -> None:
    payload = enrich_consumer_render_payload_v2(
        build_consumer_render_payload(_hail("pop")),
        _hail("pop"),
    )
    assert "stable_interest" not in payload
    lifecycle = payload["lifecycle_timing"]
    assert lifecycle["entrance_animation_ms"] == 680
    assert lifecycle["exit_animation_ms"] == 400

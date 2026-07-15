"""Phase II — choreography punch anchors in consumer payload."""

from __future__ import annotations

from hails.hail_package_v2 import enrich_consumer_render_payload_v2
from hails.hails_render_contract import build_consumer_render_payload


def _hail() -> dict:
    return {
        "id": "hail.choreography.punch.001",
        "message": {"short_text": "Choreography punch"},
        "visual": {
            "effect_id": "transporter",
            "effect_variation_id": "voyaging",
            "scale": "medium",
            "placement_id": "upper_center",
            "palette_id": "axiom_dark_cyan",
            "duration_ms": 5000,
            "priority_level": "green",
        },
    }


def test_transporter_payload_includes_phase_ii_anchors() -> None:
    hail = _hail()
    payload = enrich_consumer_render_payload_v2(build_consumer_render_payload(hail), hail)
    anchors = payload["effect_identity"]["choreography_anchors"]
    assert anchors["effectStart"] == 0.05
    assert anchors["glyphLockInOvershoot"] == 0.04
    timing = payload["lifecycle_timing"]
    assert timing["entrance_animation_ms"] == 1900
    assert timing["exit_animation_ms"] == 1400

"""Delivery envelope embeds inline presentation template for TV."""

from __future__ import annotations

from hails.hail_package_v2 import build_delivery_envelope, enrich_consumer_render_payload_v2
from hails.hails_render_contract import build_consumer_render_payload


def test_delivery_envelope_inlines_presentation_template() -> None:
    record = {
        "id": "hail.fleet_beacon.001",
        "icon": {"kind": "glyph", "value": "custom-fleet-beacon"},
        "message": {"short_text": "Achievement unlocked"},
        "visual": {
            "effect_id": "transporter",
            "scale": "medium",
            "palette_id": "axiom_dark_cyan",
            "placement_id": "upper_center",
            "presentation_template_id": "stage-breakout-v1",
        },
    }
    custom = {
        "custom-fleet-beacon": {
            "glyph_id": "custom-fleet-beacon",
            "representation_kind": "image_layers",
            "image_layers": {
                "layers": [
                    {"role": "mass", "path": "custom-fleet-beacon-mass.png"},
                    {"role": "accent", "path": "custom-fleet-beacon-accent.png"},
                ]
            },
        }
    }
    base = build_consumer_render_payload(record, custom_glyphs=custom)
    payload = enrich_consumer_render_payload_v2(base, record, custom_glyphs=custom)
    envelope = build_delivery_envelope(payload)
    overlay = envelope["overlay"]
    template = overlay.get("presentation_template")
    assert isinstance(template, dict)
    assert template["template_id"] == "stage-breakout-v1"
    stage_assets = template.get("stage_assets")
    assert isinstance(stage_assets, dict)
    assert stage_assets["back"]["image_base64"]
    assert stage_assets["front"]["image_base64"]
    identity = overlay.get("effect_identity")
    assert isinstance(identity, dict)
    anchors = identity.get("choreography_anchors")
    assert isinstance(anchors, dict)
    assert anchors["glyphImpactPeak"] == 0.46


def test_delivery_envelope_skips_template_choreography_for_pop() -> None:
    record = {
        "id": "hail.warden_alert.001",
        "icon": {"kind": "glyph", "value": "custom-warden-sigil"},
        "message": {"short_text": "Perimeter alert"},
        "visual": {
            "effect_id": "pop",
            "scale": "medium",
            "palette_id": "axiom_dark_cyan",
            "placement_id": "upper_center",
            "duration_ms": 9000,
            "presentation_template_id": "stage-medallion-v1",
        },
    }
    custom = {
        "custom-warden-sigil": {
            "glyph_id": "custom-warden-sigil",
            "representation_kind": "image",
            "image_asset": {"path": "custom-warden-sigil.png"},
        }
    }
    base = build_consumer_render_payload(record, custom_glyphs=custom)
    payload = enrich_consumer_render_payload_v2(base, record, custom_glyphs=custom)
    envelope = build_delivery_envelope(payload)
    overlay = envelope["overlay"]
    lifecycle = overlay.get("lifecycle_timing")
    assert isinstance(lifecycle, dict)
    assert lifecycle.get("stable_hold_ms") == 9000
    assert lifecycle.get("total_timed_lifecycle_ms") == 9000 + 680 + 400
    anchors = overlay.get("effect_identity", {}).get("choreography_anchors", {})
    assert anchors.get("glyphImpactPeak") == 0.4
    assert anchors.get("glyphLockIn") == 0.6

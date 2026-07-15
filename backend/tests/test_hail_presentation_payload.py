"""Presentation template on enriched consumer payload."""

from __future__ import annotations

from hails.hail_package_v2 import enrich_consumer_render_payload_v2
from hails.hails_render_contract import build_consumer_render_payload


def test_enriched_payload_includes_presentation_template() -> None:
    record = {
        "id": "hail.raster.demo",
        "icon": {"kind": "glyph", "value": "custom-fleet-beacon"},
        "message": {"short_text": "Fleet beacon hail"},
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
            "representation_kind": "image",
            "image_asset": {"path": "custom-fleet-beacon.png"},
        }
    }
    base = build_consumer_render_payload(record, custom_glyphs=custom)
    enriched = enrich_consumer_render_payload_v2(base, record, custom_glyphs=custom)
    template = enriched.get("presentation_template")
    assert isinstance(template, dict)
    assert template.get("template_id") == "stage-breakout-v1"
    assert template.get("stage_asset_urls", {}).get("back", "").endswith("back.png")
    overlay = enriched.get("presentation_overlay")
    assert isinstance(overlay, dict)
    assert overlay.get("kind") == "css_burst"

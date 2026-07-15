"""E1 — hero-centric effect_field containment and footprint sizing."""

from __future__ import annotations

from hails.hail_effect_field_layout import (
    effect_field_within_safe_zone,
    footprint_fractions,
)
from hails.hail_paintbox_layout import compute_hail_layout_regions, resolve_hail_package_layout
from hails.hails_render_contract import load_hail_render_contract_for_generation


def test_effect_field_within_safe_zone_all_tiers() -> None:
    contract = load_hail_render_contract_for_generation("v003-silhouette")
    for tier in ("small", "medium", "large"):
        for profile in ("compact", "standard", "dramatic"):
            layout = resolve_hail_package_layout(
                placement_id="upper_center",
                placement_mode="preset",
                size_tier=tier,
                contract=contract,
                effect_footprint_profile=profile,
            )
            regions = layout["layout_regions"]
            assert effect_field_within_safe_zone(regions["effect_field"], regions["safe_zone"])
            assert regions["transporter_beam_envelope"]["width"] == regions["effect_field"]["width"]
            assert regions["transporter_beam_envelope"]["height"] == regions["effect_field"]["height"]


def test_standard_transporter_wider_than_glyph_focus() -> None:
    regions = compute_hail_layout_regions(652.8, 453.6, {"messageWeight": 0.28})
    assert regions["effect_field"]["width"] >= regions["glyph_focus"]["width"]
    assert regions["effect_field"]["width"] >= regions["safe_zone"]["width"] * 0.5


def test_glyph_optically_centered_in_safe_zone() -> None:
    regions = compute_hail_layout_regions(652.8, 453.6, {"messageWeight": 0.28})
    safe = regions["safe_zone"]
    glyph = regions["glyph_focus"]
    safe_cy = safe["top"] + safe["height"] / 2
    assert abs(glyph["center_y"] - safe_cy) < 0.01
    assert abs(regions["effect_field"]["center_y"] - safe_cy) < 0.01


def test_footprint_fractions_transporter_standard() -> None:
    assert footprint_fractions("transporter", "standard") == (0.58, 0.88)


def test_dramatic_profile_wider_than_compact() -> None:
    compact = compute_hail_layout_regions(652.8, 453.6, {"messageWeight": 0.28}, effect_footprint_profile="compact")
    dramatic = compute_hail_layout_regions(652.8, 453.6, {"messageWeight": 0.28}, effect_footprint_profile="dramatic")
    assert dramatic["effect_field"]["width"] > compact["effect_field"]["width"]
    assert dramatic["effect_field"]["height"] >= compact["effect_field"]["height"]


def test_enrich_payload_respects_footprint_profile() -> None:
    from hails.hail_package_v2 import enrich_consumer_render_payload_v2
    from hails.hails_render_contract import build_consumer_render_payload

    hail = {
        "id": "hail.beta.footprint.001",
        "name": "Footprint",
        "enabled": True,
        "icon": {"value": "default"},
        "message": {"short_text": "fp"},
        "visual": {
            "effect_id": "transporter",
            "scale": "medium",
            "placement_id": "upper_center",
            "palette_id": "axiom_dark_cyan",
            "duration_ms": 5000,
            "effect_footprint_profile": "dramatic",
        },
        "delivery_policy": {
            "routes": [
                {
                    "id": "route.arcade.arcade.001",
                    "launch_room_id": "arcade",
                    "destination_room_id": "arcade",
                    "provider": "lcard",
                    "enabled": True,
                }
            ],
        },
    }
    payload = enrich_consumer_render_payload_v2(build_consumer_render_payload(hail), hail)
    assert payload["layout_regions"]["effect_field"]["effect_footprint_profile"] == "dramatic"

"""Tests for presentation template registry."""

from __future__ import annotations

from hails.hail_presentation_template import (
    build_presentation_template_entity,
    build_presentation_template_for_delivery,
    list_presentation_template_ids,
    load_presentation_template,
    merge_effect_identity_with_template_choreography,
)


def test_list_presentation_templates_includes_breakout() -> None:
    ids = list_presentation_template_ids()
    assert "stage-breakout-v1" in ids
    assert "stage-medallion-v1" in ids


def test_load_stage_breakout_template() -> None:
    template = load_presentation_template("stage-breakout-v1")
    assert template["template_id"] == "stage-breakout-v1"
    assert template["stage_assets"]["back"].endswith("back.png")
    assert template["glyph_motion"]["profile"] == "breakout_emerge"


def test_build_presentation_template_entity_from_hail_record() -> None:
    hail = {
        "visual": {
            "presentation_template_id": "stage-breakout-v1",
            "priority_level": "yellow",
        }
    }
    entity = build_presentation_template_entity(hail)
    assert entity is not None
    assert entity["template_id"] == "stage-breakout-v1"
    assert "back" in entity["stage_asset_urls"]
    assert entity["presentation_overlay"]["kind"] == "css_burst"


def test_build_presentation_template_for_delivery_inlines_pngs() -> None:
    entity = build_presentation_template_entity(
        {
            "visual": {
                "presentation_template_id": "stage-breakout-v1",
            }
        }
    )
    assert entity is not None
    delivery = build_presentation_template_for_delivery(entity)
    assert delivery is not None
    assert delivery["template_id"] == "stage-breakout-v1"
    stage_assets = delivery.get("stage_assets")
    assert isinstance(stage_assets, dict)
    assert "back" in stage_assets
    assert "front" in stage_assets
    assert stage_assets["back"]["image_base64"]
    assert stage_assets["front"]["image_base64"]
    assert "stage_asset_urls" not in delivery


def test_merge_effect_identity_with_template_choreography() -> None:
    entity = build_presentation_template_entity(
        {
            "visual": {
                "presentation_template_id": "stage-breakout-v1",
            }
        }
    )
    assert entity is not None
    merged = merge_effect_identity_with_template_choreography(
        {"choreography_anchors": {"glyphImpactPeak": 0.74}},
        entity,
    )
    assert merged is not None
    anchors = merged["choreography_anchors"]
    assert anchors["glyphImpactPeak"] == 0.46
    assert anchors["messageRevealStart"] == 0.66


def test_merge_skips_template_choreography_for_pop() -> None:
    entity = build_presentation_template_entity(
        {"visual": {"presentation_template_id": "stage-medallion-v1"}}
    )
    assert entity is not None
    merged = merge_effect_identity_with_template_choreography(
        {"choreography_anchors": {"glyphImpactPeak": 0.4, "messageRevealStart": 0.58}},
        entity,
        effect_id="pop",
    )
    assert merged is not None
    assert merged["choreography_anchors"]["glyphImpactPeak"] == 0.4
    assert merged["choreography_anchors"]["messageRevealStart"] == 0.58

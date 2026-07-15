"""Display class + silhouette v2 paint box resolution."""

from __future__ import annotations

from hails.hail_display_class import (
    DISPLAY_CLASS_PROJECTOR,
    DISPLAY_CLASS_STICK_OLED,
    display_class_for_delivery_target,
    resolve_paintbox_tier_meta,
)
from hails.hail_paintbox_layout import resolve_hail_package_layout
from hails.hails_render_contract import load_hail_render_contract_for_generation


def test_stick_oled_medium_impact_tile_fractions() -> None:
    contract = load_hail_render_contract_for_generation("v003-silhouette")
    meta = resolve_paintbox_tier_meta(contract, "medium", display_class=DISPLAY_CLASS_STICK_OLED)
    assert meta["widthFraction"] == 0.34
    assert meta["heightFraction"] == 0.42


def test_projector_medium_fractions() -> None:
    contract = load_hail_render_contract_for_generation("v003-silhouette")
    meta = resolve_paintbox_tier_meta(contract, "medium", display_class=DISPLAY_CLASS_PROJECTOR)
    assert meta["widthFraction"] == 0.44
    assert meta["heightFraction"] == 0.58


def test_projector_red_uses_announce_band() -> None:
    contract = load_hail_render_contract_for_generation("v003-silhouette")
    meta = resolve_paintbox_tier_meta(
        contract,
        "medium",
        display_class=DISPLAY_CLASS_PROJECTOR,
        priority_level="red",
    )
    assert meta["widthFraction"] == 0.58
    assert meta["heightFraction"] == 0.72


def test_projector_layout_paint_box_pixels() -> None:
    contract = load_hail_render_contract_for_generation("v003-silhouette")
    layout = resolve_hail_package_layout(
        placement_id="upper_center",
        placement_mode="preset",
        size_tier="medium",
        contract=contract,
        display_class=DISPLAY_CLASS_PROJECTOR,
    )
    box = layout["paint_box_screen"]
    assert abs(box["width"] - 1920 * 0.44) < 1.0
    assert abs(box["height"] - 1080 * 0.58) < 1.0


def test_glyph_width_meets_v2_fill_target() -> None:
    contract = load_hail_render_contract_for_generation("v003-silhouette")
    layout = resolve_hail_package_layout(
        placement_id="upper_center",
        placement_mode="preset",
        size_tier="medium",
        contract=contract,
        display_class=DISPLAY_CLASS_STICK_OLED,
    )
    regions = layout["layout_regions"]
    ratio = regions["glyph_focus"]["width"] / regions["paint_box"]["width"]
    assert ratio >= 0.45


def test_fleet_delivery_target_display_class() -> None:
    assert display_class_for_delivery_target("arcade") == DISPLAY_CLASS_PROJECTOR
    assert display_class_for_delivery_target("away_team") == DISPLAY_CLASS_STICK_OLED

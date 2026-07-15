"""Golden fixture stays aligned with backend layout resolver (B6)."""

from __future__ import annotations

import json
from pathlib import Path

from hails.hail_paintbox_layout import resolve_hail_package_layout
from hails.hails_render_contract import load_hail_render_contract_for_generation

REPO_ROOT = Path(__file__).resolve().parents[2]
GOLDEN_PATH = REPO_ROOT / "config" / "hails" / "fixtures" / "hail-package-v2-parity-golden.json"


def _rect_close(a: dict, b: dict, *, eps: float = 1.5) -> bool:
    for key in ("left", "top", "width", "height"):
        if abs(float(a[key]) - float(b[key])) > eps:
            return False
    return True


def _regions_close(a: dict, b: dict, *, eps: float = 1.5) -> bool:
    for region in ("paint_box", "safe_zone", "glyph_focus", "message_band"):
        if not _rect_close(a[region], b[region], eps=eps):
            return False
    if "effect_field" in a and "effect_field" in b:
        if not _rect_close(a["effect_field"], b["effect_field"], eps=eps):
            return False
    for key in (
        "message_weight",
        "transporter_beam_height_multiplier",
        "safe_zone_inset_fraction",
        "glyph_focus_fraction",
    ):
        if abs(float(a[key]) - float(b[key])) > 0.001:
            return False
    return True


def test_golden_fixture_matches_resolver() -> None:
    golden = json.loads(GOLDEN_PATH.read_text(encoding="utf-8"))
    contract = load_hail_render_contract_for_generation("v003-silhouette")
    layout = resolve_hail_package_layout(
        placement_id=golden["placement_id"],
        placement_mode=golden["placement_mode"],
        size_tier=golden["size_tier"],
        contract=contract,
        display_class=golden.get("display_class"),
    )
    assert _regions_close(layout["layout_regions"], golden["layout_regions"])
    assert layout["paint_box_screen"] == golden["paint_box_screen"]
    assert layout["reference_viewport"] == golden["reference_viewport"]


def test_golden_consumer_payload_lifecycle_timing() -> None:
    """APK + Forge preview share contract entrance / hold / exit separation."""
    from hails.hails_render_contract import build_consumer_render_payload

    golden = json.loads(GOLDEN_PATH.read_text(encoding="utf-8"))
    hail = {
        "id": golden["id"],
        "message": {"short_text": golden["message"]},
        "visual": {
            "effect_id": golden.get("effect_id", "transporter"),
            "effect_variation_id": golden.get("effect_variation_id", "voyaging"),
            "glyph_id": golden.get("glyph_id", "default"),
            "palette_id": "axiom_dark_cyan",
            "duration_ms": 5000,
            "placement_id": golden["placement_id"],
            "placement_mode": golden["placement_mode"],
            "size_tier": golden["size_tier"],
            "message_sidekick_id": "secondary_fade",
        },
        "catalog_ready": True,
        "package_schema_version": 2,
    }
    payload = build_consumer_render_payload(hail)
    timing = payload["lifecycle_timing"]
    assert timing["entrance_animation_ms"] == 1900
    assert timing["exit_animation_ms"] == 1400
    assert timing["stable_hold_ms"] == 5000
    assert timing["total_timed_lifecycle_ms"] == 1900 + 5000 + 1400

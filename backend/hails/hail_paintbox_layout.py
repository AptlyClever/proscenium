"""Paint Box layout regions — port of LCARD computeHailLayoutRegions + resolvePaintBoxRect."""

from __future__ import annotations

from typing import Any

from hails.hail_display_class import resolve_paintbox_tier_meta
from hails.hail_effect_field_layout import compute_effect_field_region


REFERENCE_VIEWPORT = {"width": 1920, "height": 1080}


def _clamp(value: float, lo: float, hi: float, default: float) -> float:
    if not isinstance(value, (int, float)) or value != value:  # NaN
        return default
    return max(lo, min(hi, float(value)))


def resolve_paintbox_tier(
    contract: dict[str, Any],
    tier_id: str,
    *,
    display_class: str | None = None,
    priority_level: str | None = None,
) -> dict[str, Any]:
    return resolve_paintbox_tier_meta(
        contract,
        tier_id,
        display_class=display_class,
        priority_level=priority_level,
    )


def edge_padding(
    placement_id: str,
    screen_w: float,
    screen_h: float,
    insets: dict[str, Any],
) -> dict[str, float]:
    horizontal = screen_w * float(insets.get("horizontalFraction") or 0)
    top = screen_h * float(insets.get("topFraction") or 0)
    bottom = screen_h * float(insets.get("bottomFraction") or 0)
    extra_top = float(insets.get("upperCenterExtraTopFraction") or 0)

    if placement_id == "top_right":
        return {"top": top, "end": horizontal, "bottom": 0.0, "start": 0.0}
    if placement_id == "top_left":
        return {"top": top, "start": horizontal, "bottom": 0.0, "end": 0.0}
    if placement_id == "bottom_right":
        return {"bottom": bottom, "end": horizontal, "top": 0.0, "start": 0.0}
    if placement_id == "bottom_left":
        return {"bottom": bottom, "start": horizontal, "top": 0.0, "end": 0.0}
    if placement_id == "upper_center":
        return {
            "top": top + screen_h * extra_top,
            "start": 0.0,
            "end": 0.0,
            "bottom": 0.0,
        }
    if placement_id == "lower_center":
        return {"bottom": bottom, "start": 0.0, "end": 0.0, "top": 0.0}
    if placement_id == "center_soft":
        center_soft = screen_h * float(insets.get("centerSoftVerticalFraction") or 0)
        return {"top": center_soft, "bottom": center_soft, "start": 0.0, "end": 0.0}
    return {"top": top, "start": 0.0, "end": 0.0, "bottom": 0.0}


def resolve_paint_box_rect(
    *,
    placement_id: str,
    placement_mode: str,
    size_tier: str,
    contract: dict[str, Any],
    screen_w: float = REFERENCE_VIEWPORT["width"],
    screen_h: float = REFERENCE_VIEWPORT["height"],
    x_percent: float | None = None,
    y_percent: float | None = None,
    display_class: str | None = None,
    priority_level: str | None = None,
) -> dict[str, Any]:
    tier = resolve_paintbox_tier(
        contract,
        size_tier,
        display_class=display_class,
        priority_level=priority_level,
    )
    box_w = screen_w * float(tier.get("widthFraction") or 0.32)
    box_h = screen_h * float(tier.get("heightFraction") or 0.34)
    placement = contract.get("placement") if isinstance(contract.get("placement"), dict) else {}
    insets = placement.get("edgeInsets") if isinstance(placement.get("edgeInsets"), dict) else {}

    if placement_mode == "custom" and x_percent is not None and y_percent is not None:
        min_pct = float(placement.get("minPercent") or 5)
        max_pct = float(placement.get("maxPercent") or 95)
        x = max(min_pct, min(max_pct, float(x_percent))) / 100.0
        y = max(min_pct, min(max_pct, float(y_percent))) / 100.0
        return {
            "left": screen_w * x - box_w / 2,
            "top": screen_h * y - box_h / 2,
            "width": box_w,
            "height": box_h,
            "placement_id": "custom",
            "paint_box_tier": size_tier,
        }

    pid = placement_id or "upper_center"
    pad = edge_padding(pid, screen_w, screen_h, insets)
    left = pad["start"]
    top = pad["top"]

    if pid in ("top_right", "bottom_right"):
        left = screen_w - pad["end"] - box_w
    elif pid in ("upper_center", "lower_center", "center_soft"):
        left = (screen_w - box_w) / 2

    if pid in ("bottom_right", "bottom_left", "lower_center"):
        top = screen_h - pad["bottom"] - box_h
    elif pid == "center_soft":
        top = (screen_h - box_h) / 2

    return {
        "left": left,
        "top": top,
        "width": box_w,
        "height": box_h,
        "placement_id": pid,
        "paint_box_tier": size_tier,
    }


def compute_hail_layout_regions(
    box_width: float,
    box_height: float,
    paint_box_meta: dict[str, Any] | None = None,
    *,
    effect_id: str = "transporter",
    effect_footprint_profile: str = "standard",
    footprint_scale: float = 1.0,
) -> dict[str, Any]:
    """Paint-box-local pixel regions (mirrors LCARD effect-config.js)."""
    meta = paint_box_meta or {}
    inset_frac = _clamp(meta.get("safeZoneInsetFraction"), 0.06, 0.2, 0.11)
    glyph_frac = _clamp(meta.get("glyphFocusFraction"), 0.45, 0.8, 0.64)
    beam_mul = _clamp(meta.get("transporterBeamHeightMultiplier"), 1.1, 2.2, 1.5)
    message_weight = _clamp(meta.get("messageWeight"), 0.2, 0.5, 0.36)
    profile = str(
        effect_footprint_profile or meta.get("effectFootprintProfile") or "standard"
    ).strip().lower()

    inset_x = box_width * inset_frac
    inset_y = box_height * inset_frac
    safe_zone = {
        "left": inset_x,
        "top": inset_y,
        "width": max(1.0, box_width - inset_x * 2),
        "height": max(1.0, box_height - inset_y * 2),
    }

    glyph_h = safe_zone["height"] * glyph_frac
    glyph_width_frac = _clamp(meta.get("glyphWidthFractionOfPaintBox"), 0.35, 0.65, 0.48)
    glyph_w = min(
        safe_zone["width"],
        max(glyph_h * 1.05, box_width * glyph_width_frac),
    )
    center_x = safe_zone["left"] + safe_zone["width"] / 2.0
    center_y = safe_zone["top"] + safe_zone["height"] / 2.0
    glyph_top = center_y - glyph_h / 2.0
    glyph_focus = {
        "left": safe_zone["left"] + (safe_zone["width"] - glyph_w) / 2,
        "top": glyph_top,
        "width": glyph_w,
        "height": glyph_h,
        "center_x": center_x,
        "center_y": center_y,
    }

    effect_field = compute_effect_field_region(
        safe_zone=safe_zone,
        glyph_visual_size_px=max(glyph_w, glyph_h),
        effect_id=effect_id,
        effect_footprint_profile=profile,
        footprint_scale=footprint_scale,
    )
    transporter_beam_envelope = {
        "left": effect_field["left"],
        "top": effect_field["top"],
        "width": effect_field["width"],
        "height": effect_field["height"],
        "center_x": effect_field["center_x"],
        "center_y": effect_field["center_y"],
        "bottom": effect_field["bottom"],
    }

    message_band_height = max(1.0, box_height * message_weight * 0.35)
    message_band = {
        "left": glyph_focus["left"],
        "top": glyph_focus["top"] + glyph_focus["height"],
        "width": glyph_w,
        "height": message_band_height,
    }

    return {
        "paint_box": {"left": 0.0, "top": 0.0, "width": box_width, "height": box_height},
        "safe_zone": safe_zone,
        "glyph_focus": glyph_focus,
        "effect_field": effect_field,
        "transporter_beam_envelope": transporter_beam_envelope,
        "message_band": message_band,
        "message_weight": message_weight,
        "transporter_beam_height_multiplier": beam_mul,
        "safe_zone_inset_fraction": inset_frac,
        "glyph_focus_fraction": glyph_frac,
    }


def resolve_hail_package_layout(
    *,
    placement_id: str,
    placement_mode: str,
    size_tier: str,
    contract: dict[str, Any],
    x_percent: float | None = None,
    y_percent: float | None = None,
    effect_id: str = "transporter",
    effect_footprint_profile: str = "standard",
    footprint_scale: float = 1.0,
    display_class: str | None = None,
    priority_level: str | None = None,
) -> dict[str, Any]:
    paint_box_rect = resolve_paint_box_rect(
        placement_id=placement_id,
        placement_mode=placement_mode,
        size_tier=size_tier,
        contract=contract,
        x_percent=x_percent,
        y_percent=y_percent,
        display_class=display_class,
        priority_level=priority_level,
    )
    tier_meta = resolve_paintbox_tier(
        contract,
        size_tier,
        display_class=display_class,
        priority_level=priority_level,
    )
    layout_regions = compute_hail_layout_regions(
        paint_box_rect["width"],
        paint_box_rect["height"],
        tier_meta,
        effect_id=effect_id,
        effect_footprint_profile=effect_footprint_profile,
        footprint_scale=footprint_scale,
    )
    return {
        "reference_viewport": dict(REFERENCE_VIEWPORT),
        "paint_box_screen": paint_box_rect,
        "layout_regions": layout_regions,
    }


def _rect_close(a: dict[str, Any], b: dict[str, Any], *, eps: float = 1.5) -> bool:
    for key in ("left", "top", "width", "height"):
        if abs(float(a[key]) - float(b[key])) > eps:
            return False
    return True


def layout_regions_match_canonical(
    frozen: dict[str, Any],
    canonical: dict[str, Any],
    *,
    eps: float = 1.5,
) -> bool:
    for region in ("paint_box", "safe_zone", "glyph_focus", "message_band"):
        frozen_region = frozen.get(region)
        if not isinstance(frozen_region, dict):
            return False
        if not _rect_close(frozen_region, canonical[region], eps=eps):
            return False
    frozen_effect = frozen.get("effect_field")
    canonical_effect = canonical.get("effect_field")
    if isinstance(frozen_effect, dict) and isinstance(canonical_effect, dict):
        if not _rect_close(frozen_effect, canonical_effect, eps=eps):
            return False
    for key in (
        "message_weight",
        "transporter_beam_height_multiplier",
        "safe_zone_inset_fraction",
        "glyph_focus_fraction",
    ):
        if abs(float(frozen[key]) - float(canonical[key])) > 0.001:
            return False
    return True


def validate_layout_regions_parity(
    payload: dict[str, Any],
    *,
    contract: dict[str, Any],
    eps: float = 1.5,
) -> list[dict[str, str]]:
    """B6 — frozen layout_regions must match canonical resolver output."""
    frozen = payload.get("layout_regions")
    if not isinstance(frozen, dict):
        return [{"path": "/layout_regions", "message": "layout_regions must be an object"}]

    frozen_effect = frozen.get("effect_field")
    effect_footprint_profile = "standard"
    if isinstance(frozen_effect, dict) and frozen_effect.get("effect_footprint_profile"):
        effect_footprint_profile = str(frozen_effect["effect_footprint_profile"])
    layout = resolve_hail_package_layout(
        placement_id=str(payload.get("placement_id") or "upper_center"),
        placement_mode=str(payload.get("placement_mode") or "preset"),
        size_tier=str(payload.get("size_tier") or "medium"),
        contract=contract,
        x_percent=payload.get("x_percent"),
        y_percent=payload.get("y_percent"),
        effect_id=str(payload.get("effect_id") or "transporter"),
        effect_footprint_profile=effect_footprint_profile,
        display_class=payload.get("display_class"),
        priority_level=payload.get("priority_level"),
    )
    canonical = layout["layout_regions"]
    if layout_regions_match_canonical(frozen, canonical, eps=eps):
        return []
    return [
        {
            "path": "/layout_regions",
            "message": "layout_regions do not match canonical Paint Box resolver (B6 parity)",
        }
    ]

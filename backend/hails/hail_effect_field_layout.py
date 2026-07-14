"""Hero-centric effect field sizing — imprint-hail-hero-centric-effect-field E1."""

from __future__ import annotations

from typing import Any

TRANSPORTER_FOOTPRINT_FRACTIONS: dict[str, tuple[float, float]] = {
    "compact": (0.30, 0.70),
    "standard": (0.58, 0.88),
    "dramatic": (0.52, 0.94),
}

DEFAULT_FOOTPRINT_FRACTIONS: tuple[float, float] = (0.58, 0.88)

# Minimum field size as multiples of glyph visual size — profile-aware so compact ≠ standard.
_FOOTPRINT_GLYPH_FLOOR: dict[str, tuple[float, float]] = {
    "compact": (1.04, 1.20),
    "standard": (1.08, 1.30),
    "dramatic": (1.12, 1.40),
}


def _clamp(value: float, lo: float, hi: float, default: float) -> float:
    if not isinstance(value, (int, float)) or value != value:
        return default
    return max(lo, min(hi, float(value)))


def resolve_effect_footprint_profile(value: Any) -> str:
    profile = str(value or "standard").strip().lower()
    if profile in TRANSPORTER_FOOTPRINT_FRACTIONS:
        return profile
    return "standard"


def footprint_fractions(effect_id: str, profile: str) -> tuple[float, float]:
    if effect_id == "transporter":
        return TRANSPORTER_FOOTPRINT_FRACTIONS.get(profile, DEFAULT_FOOTPRINT_FRACTIONS)
    return DEFAULT_FOOTPRINT_FRACTIONS


def compute_effect_field_region(
    *,
    safe_zone: dict[str, float],
    glyph_visual_size_px: float,
    effect_id: str = "transporter",
    effect_footprint_profile: str = "standard",
    footprint_scale: float = 1.0,
) -> dict[str, Any]:
    """Axis-aligned effect field inside safe_zone, centered on glyph optical center."""
    profile = resolve_effect_footprint_profile(effect_footprint_profile)
    width_frac, height_frac = footprint_fractions(effect_id, profile)
    scale = _clamp(footprint_scale, 0.85, 1.25, 1.0)

    optical_cx = safe_zone["left"] + safe_zone["width"] / 2.0
    optical_cy = safe_zone["top"] + safe_zone["height"] / 2.0

    field_w = safe_zone["width"] * width_frac * scale
    field_h = safe_zone["height"] * height_frac * scale
    width_floor_mul, height_floor_mul = _FOOTPRINT_GLYPH_FLOOR.get(profile, (1.08, 1.30))
    field_w = max(field_w, glyph_visual_size_px * width_floor_mul)
    field_h = max(field_h, glyph_visual_size_px * height_floor_mul)
    field_w = min(field_w, safe_zone["width"])
    field_h = min(field_h, safe_zone["height"])

    left = optical_cx - field_w / 2.0
    top = optical_cy - field_h / 2.0
    left = max(safe_zone["left"], min(left, safe_zone["left"] + safe_zone["width"] - field_w))
    top = max(safe_zone["top"], min(top, safe_zone["top"] + safe_zone["height"] - field_h))

    shape = "column" if effect_id == "transporter" else "rect"
    return {
        "left": left,
        "top": top,
        "width": field_w,
        "height": field_h,
        "center_x": optical_cx,
        "center_y": optical_cy,
        "shape": shape,
        "anchor": "glyph_optical_center",
        "effect_field_fraction": {
            "width_of_safe_zone": field_w / safe_zone["width"] if safe_zone["width"] else 0.0,
            "height_of_safe_zone": field_h / safe_zone["height"] if safe_zone["height"] else 0.0,
        },
        "effect_footprint_profile": profile,
        "glyph_optical_center": {"x": optical_cx, "y": optical_cy},
        "bottom": top + field_h,
    }


def effect_field_within_safe_zone(effect_field: dict[str, Any], safe_zone: dict[str, float]) -> bool:
    left = float(effect_field["left"])
    top = float(effect_field["top"])
    right = left + float(effect_field["width"])
    bottom = top + float(effect_field["height"])
    safe_right = safe_zone["left"] + safe_zone["width"]
    safe_bottom = safe_zone["top"] + safe_zone["height"]
    return (
        left >= safe_zone["left"] - 0.01
        and top >= safe_zone["top"] - 0.01
        and right <= safe_right + 0.01
        and bottom <= safe_bottom + 0.01
    )

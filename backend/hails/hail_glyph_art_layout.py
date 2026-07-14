"""E3 — layout_regions.glyph_art from procedural ink bounds (card-style breakout)."""

from __future__ import annotations

import re
from typing import Any

_COORD_RE = re.compile(r"(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)")

GLYPH_VIEWBOX_SIZE = 48.0
ART_FOCUS_PADDING_FRACTION = 0.06
MIN_EFFECT_FIELD_WIDTH_RATIO = 0.95


def _subject_paths(paths: list[dict[str, Any]]) -> list[dict[str, Any]]:
    subjects: list[dict[str, Any]] = []
    for row in paths:
        opacity = float(row.get("opacity", 1.0))
        if opacity > 0.5:
            subjects.append(row)
    return subjects or paths


def _parse_path_points(paths: list[dict[str, Any]]) -> list[tuple[float, float]]:
    points: list[tuple[float, float]] = []
    for row in paths:
        d = str(row.get("d", ""))
        for match in _COORD_RE.finditer(d):
            points.append((float(match.group(1)), float(match.group(2))))
    return points


def procedural_graph_ink_bbox(graph: dict[str, Any]) -> dict[str, float] | None:
    """Axis-aligned ink bounds in procedural viewBox coordinates."""
    paths = list(graph.get("paths") or [])
    circles = list(graph.get("circles") or [])
    points = _parse_path_points(_subject_paths(paths))
    for circle in circles:
        cx = float(circle.get("cx", 0))
        cy = float(circle.get("cy", 0))
        r = float(circle.get("r", 0))
        points.extend(
            [
                (cx - r, cy - r),
                (cx + r, cy + r),
            ]
        )
    if not points:
        return None
    xs = [p[0] for p in points]
    ys = [p[1] for p in points]
    min_x, max_x = min(xs), max(xs)
    min_y, max_y = min(ys), max(ys)
    width = max(1.0, max_x - min_x)
    height = max(1.0, max_y - min_y)
    return {"left": min_x, "top": min_y, "width": width, "height": height}


def _clamp_rect_inside(
    container: dict[str, float],
    rect: dict[str, float],
) -> dict[str, float] | None:
    left = max(container["left"], rect["left"])
    top = max(container["top"], rect["top"])
    right = min(container["left"] + container["width"], rect["left"] + rect["width"])
    bottom = min(container["top"] + container["height"], rect["top"] + rect["height"])
    if right <= left or bottom <= top:
        return None
    width = right - left
    height = bottom - top
    return {
        "left": left,
        "top": top,
        "width": width,
        "height": height,
        "center_x": left + width / 2.0,
        "center_y": top + height / 2.0,
    }


def compute_glyph_art_region(
    *,
    glyph_render: dict[str, Any] | None,
    glyph_focus: dict[str, Any],
    effect_field: dict[str, Any],
) -> dict[str, float] | None:
    """Paint-box-local glyph_art rect; None when v1 fallback (no procedural ink or no breakout)."""
    if not isinstance(glyph_render, dict) or glyph_render.get("kind") != "procedural":
        return None
    graph = glyph_render.get("procedural_graph")
    if not isinstance(graph, dict):
        return None

    ink = procedural_graph_ink_bbox(graph)
    if not ink or ink["width"] <= 0 or ink["height"] <= 0:
        return None

    pad = ART_FOCUS_PADDING_FRACTION
    avail_w = max(1.0, glyph_focus["width"] * (1.0 - pad * 2.0))
    avail_h = max(1.0, glyph_focus["height"] * (1.0 - pad * 2.0))
    scale = min(avail_w / ink["width"], avail_h / ink["height"])
    art_w = ink["width"] * scale
    art_h = ink["height"] * scale

    if art_w >= effect_field["width"] * MIN_EFFECT_FIELD_WIDTH_RATIO:
        return None

    center_x = float(glyph_focus["center_x"])
    center_y = float(glyph_focus["center_y"])
    rect = {
        "left": center_x - art_w / 2.0,
        "top": center_y - art_h / 2.0,
        "width": art_w,
        "height": art_h,
        "center_x": center_x,
        "center_y": center_y,
    }
    clamped = _clamp_rect_inside(effect_field, rect)
    if not clamped:
        return None
    if clamped["width"] >= effect_field["width"] * MIN_EFFECT_FIELD_WIDTH_RATIO:
        return None
    return clamped


def attach_glyph_art_to_layout_regions(
    layout_regions: dict[str, Any],
    glyph_render: dict[str, Any] | None,
) -> dict[str, Any]:
    """Return layout_regions with optional glyph_art when card-trick breakout applies."""
    out = dict(layout_regions)
    glyph_focus = out.get("glyph_focus")
    effect_field = out.get("effect_field")
    if not isinstance(glyph_focus, dict) or not isinstance(effect_field, dict):
        out.pop("glyph_art", None)
        return out

    glyph_art = compute_glyph_art_region(
        glyph_render=glyph_render,
        glyph_focus=glyph_focus,
        effect_field=effect_field,
    )
    if glyph_art:
        out["glyph_art"] = glyph_art
    else:
        out.pop("glyph_art", None)
    return out


def glyph_art_within_effect_field(
    glyph_art: dict[str, Any],
    effect_field: dict[str, Any],
    *,
    eps: float = 0.01,
) -> bool:
    return (
        glyph_art["left"] >= effect_field["left"] - eps
        and glyph_art["top"] >= effect_field["top"] - eps
        and glyph_art["left"] + glyph_art["width"] <= effect_field["left"] + effect_field["width"] + eps
        and glyph_art["top"] + glyph_art["height"] <= effect_field["top"] + effect_field["height"] + eps
    )


def glyph_art_within_safe_zone(
    glyph_art: dict[str, Any],
    safe_zone: dict[str, Any],
    *,
    eps: float = 0.01,
) -> bool:
    return (
        glyph_art["left"] >= safe_zone["left"] - eps
        and glyph_art["top"] >= safe_zone["top"] - eps
        and glyph_art["left"] + glyph_art["width"] <= safe_zone["left"] + safe_zone["width"] + eps
        and glyph_art["top"] + glyph_art["height"] <= safe_zone["top"] + safe_zone["height"] + eps
    )


def validate_glyph_art_regions(layout_regions: dict[str, Any]) -> list[dict[str, str]]:
    glyph_art = layout_regions.get("glyph_art")
    if not isinstance(glyph_art, dict):
        return []
    errors: list[dict[str, str]] = []
    effect_field = layout_regions.get("effect_field")
    safe_zone = layout_regions.get("safe_zone")
    if not isinstance(effect_field, dict):
        errors.append({"path": "/layout_regions/glyph_art", "message": "effect_field required when glyph_art present"})
        return errors
    if not glyph_art_within_effect_field(glyph_art, effect_field):
        errors.append(
            {
                "path": "/layout_regions/glyph_art",
                "message": "glyph_art must be contained in effect_field",
            }
        )
    if isinstance(safe_zone, dict) and not glyph_art_within_safe_zone(glyph_art, safe_zone):
        errors.append(
            {
                "path": "/layout_regions/glyph_art",
                "message": "glyph_art must be contained in safe_zone",
            }
        )
    return errors

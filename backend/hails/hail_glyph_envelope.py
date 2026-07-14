"""Ghost-shield occupancy envelope for procedural glyphs (L0 fleet consistency).

Invisible soft-heater composition zone — no mandatory visible frame. Content may
represent emblem, icon, or object; all marks share scale, anchor, and mask bounds.
See docs/hails/glyph-envelope-v001.md.
"""

from __future__ import annotations

import hashlib
import re
from typing import Any

from hails.hail_glyph_optical import OPTICAL_TARGET, normalize_procedural_graph_optical_center, translate_path_d

GHOST_SHIELD_ENVELOPE_ID = "ghost_shield_v1"
_COORD_RE = re.compile(r"(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)")

# Median H3.5 soft-heater field at optical center (cx=24).
# Phase C-A — expanded occupancy so hero focal floor (≥20dp) fits inside mask (was ~12dp max square).
_SHIELD_HALF = 13
_SHIELD_TOP = 9
_SHIELD_BOTTOM = 39
_SHIELD_HEIGHT = _SHIELD_BOTTOM - _SHIELD_TOP
# Phase C-A — scale toward floor inside mask; jitter uplift finishes (min factor 0.92 → ~18.4dp)
_HERO_FOCAL_TARGET_LONGEST = 22.0
_TARGET_OCCUPANCY = _HERO_FOCAL_TARGET_LONGEST / _SHIELD_HEIGHT
_MIN_SCALE = 0.35
_MAX_SCALE = 1.55
_MASK_INSET = 1.0
_FOCAL_UPLIFT_FACTOR = 1.03
_FOCAL_UPLIFT_MAX_STEPS = 24


def ghost_shield_polygon(cx: float = 24.0, cy: float = 24.0) -> list[tuple[float, float]]:
    """Soft-heater occupancy polygon — matches median slot_shield field geometry."""
    half = float(_SHIELD_HALF)
    top = cy - (24 - _SHIELD_TOP)
    bottom = cy + (_SHIELD_BOTTOM - 24)
    top_curve_y = top + 4.0
    bottom_flat_y = bottom - 4.0
    return [
        (cx - half, top_curve_y),
        (cx, top),
        (cx + half, top_curve_y),
        (cx + half - 1.0, bottom_flat_y),
        (cx, bottom),
        (cx - half + 1.0, bottom_flat_y),
    ]


def _parse_points_from_paths(paths: list[dict[str, Any]]) -> list[tuple[float, float]]:
    points: list[tuple[float, float]] = []
    for row in paths:
        d = str(row.get("d", ""))
        for match in _COORD_RE.finditer(d):
            points.append((float(match.group(1)), float(match.group(2))))
    return points


def _parse_mass_points_from_paths(paths: list[dict[str, Any]]) -> list[tuple[float, float]]:
    return _parse_points_from_paths(paths)


def _subject_paths(paths: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Charge ink for stroke legibility gates."""
    subjects: list[dict[str, Any]] = []
    for row in paths:
        opacity = float(row.get("opacity", 1.0))
        if opacity > 0.5:
            subjects.append(row)
    return subjects or paths


def _emblem_paths(paths: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Integrated field + charge ink (includes charge_forward field at ~0.19)."""
    emblem = [row for row in paths if float(row.get("opacity", 1.0)) >= 0.18]
    return emblem or paths


def _content_points(paths: list[dict[str, Any]], circles: list[dict[str, Any]]) -> list[tuple[float, float]]:
    points = _parse_points_from_paths(_emblem_paths(paths))
    for circle in circles:
        points.append((float(circle["cx"]), float(circle["cy"])))
    return points


def _point_in_polygon(point: tuple[float, float], polygon: list[tuple[float, float]]) -> bool:
    x, y = point
    inside = False
    n = len(polygon)
    for i in range(n):
        x1, y1 = polygon[i]
        x2, y2 = polygon[(i + 1) % n]
        if ((y1 > y) != (y2 > y)) and (x < (x2 - x1) * (y - y1) / (y2 - y1 + 1e-12) + x1):
            inside = not inside
    return inside


def _points_inside_mask(
    points: list[tuple[float, float]],
    polygon: list[tuple[float, float]],
    *,
    inset: float,
) -> bool:
    if not points:
        return True
    shrunk = _shrink_polygon(polygon, inset)
    return all(_point_in_polygon(point, shrunk) for point in points)


def _shrink_polygon(polygon: list[tuple[float, float]], inset: float) -> list[tuple[float, float]]:
    if inset <= 0:
        return polygon
    cx = sum(p[0] for p in polygon) / len(polygon)
    cy = sum(p[1] for p in polygon) / len(polygon)
    factor = max(0.55, 1.0 - inset / max(_SHIELD_HEIGHT / 2.0, 1.0))
    return [(cx + (x - cx) * factor, cy + (y - cy) * factor) for x, y in polygon]


def scale_path_d(d: str, cx: float, cy: float, factor: float) -> str:
    def repl(match: re.Match[str]) -> str:
        x = float(match.group(1))
        y = float(match.group(2))
        nx = cx + (x - cx) * factor
        ny = cy + (y - cy) * factor
        if abs(nx - round(nx)) < 1e-6 and abs(ny - round(ny)) < 1e-6:
            return f"{int(round(nx))} {int(round(ny))}"
        return f"{nx:g} {ny:g}"

    return _COORD_RE.sub(repl, d)


def _scale_paths(
    paths: list[dict[str, Any]],
    circles: list[dict[str, Any]],
    cx: float,
    cy: float,
    factor: float,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    new_paths: list[dict[str, Any]] = []
    for row in paths:
        new_row = dict(row)
        new_row["d"] = scale_path_d(str(row.get("d", "")), cx, cy, factor)
        new_paths.append(new_row)

    new_circles: list[dict[str, Any]] = []
    for row in circles:
        new_row = dict(row)
        new_row["cx"] = int(round(cx + (float(row["cx"]) - cx) * factor))
        new_row["cy"] = int(round(cy + (float(row["cy"]) - cy) * factor))
        new_row["r"] = max(1, int(round(float(row["r"]) * factor)))
        new_circles.append(new_row)

    return new_paths, new_circles


def _bbox_height(points: list[tuple[float, float]]) -> float:
    if not points:
        return 0.0
    ys = [p[1] for p in points]
    return max(ys) - min(ys)


def _bbox_longest_edge(points: list[tuple[float, float]]) -> float:
    if not points:
        return 0.0
    xs = [p[0] for p in points]
    ys = [p[1] for p in points]
    return max(max(xs) - min(xs), max(ys) - min(ys))


def _longest_content_edge(
    paths: list[dict[str, Any]],
    circles: list[dict[str, Any]],
) -> float:
    points = _parse_mass_points_from_paths(_emblem_paths(paths))
    for circle in circles:
        cx = float(circle["cx"])
        cy = float(circle["cy"])
        r = float(circle["r"])
        points.extend(((cx - r, cy - r), (cx + r, cy + r)))
    return _bbox_longest_edge(points)


def _contain_and_uplift_focal_mass(
    paths: list[dict[str, Any]],
    circles: list[dict[str, Any]],
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Shrink escaped ink into mask, then uplift toward hero focal floor."""
    cx, cy = float(OPTICAL_TARGET[0]), float(OPTICAL_TARGET[1])
    polygon = ghost_shield_polygon(cx, cy)
    focal_floor = 20.0

    for _ in range(14):
        points = _content_points(paths, circles)
        if _points_inside_mask(points, polygon, inset=_MASK_INSET):
            break
        paths, circles = _scale_paths(paths, circles, cx, cy, 0.92)

    for _ in range(_FOCAL_UPLIFT_MAX_STEPS):
        if _longest_content_edge(paths, circles) >= focal_floor:
            break
        trial_paths, trial_circles = _scale_paths(paths, circles, cx, cy, _FOCAL_UPLIFT_FACTOR)
        trial_points = _content_points(trial_paths, trial_circles)
        if not _points_inside_mask(trial_points, polygon, inset=_MASK_INSET):
            break
        paths, circles = trial_paths, trial_circles

    longest = _longest_content_edge(paths, circles)
    if focal_floor - 1.0 <= longest < focal_floor:
        trial_paths, trial_circles = _scale_paths(paths, circles, cx, cy, 1.02)
        trial_points = _content_points(trial_paths, trial_circles)
        if _points_inside_mask(trial_points, polygon, inset=_MASK_INSET):
            paths, circles = trial_paths, trial_circles

    focal_max = 28.0
    for _ in range(24):
        if _longest_content_edge(paths, circles) <= focal_max:
            break
        paths, circles = _scale_paths(paths, circles, cx, cy, 0.94)

    for _ in range(_FOCAL_UPLIFT_MAX_STEPS):
        if _longest_content_edge(paths, circles) >= focal_floor:
            break
        trial_paths, trial_circles = _scale_paths(paths, circles, cx, cy, _FOCAL_UPLIFT_FACTOR)
        trial_points = _content_points(trial_paths, trial_circles)
        if not _points_inside_mask(trial_points, polygon, inset=_MASK_INSET):
            break
        if _longest_content_edge(trial_paths, trial_circles) > focal_max:
            break
        paths, circles = trial_paths, trial_circles

    return paths, circles


def uplift_procedural_graph_hero_focal_mass(graph: dict[str, Any]) -> dict[str, Any]:
    """Post-jitter reconcile — contain in mask, uplift to focal floor."""
    paths = list(graph.get("paths") or [])
    circles = list(graph.get("circles") or [])
    if not paths:
        return graph
    paths, circles = _contain_and_uplift_focal_mass(paths, circles)
    out = dict(graph)
    out["paths"] = paths
    if circles:
        out["circles"] = circles
    else:
        out.pop("circles", None)
    out["signature"] = _graph_signature(paths, circles)
    return out


def _graph_signature(paths: list[dict[str, Any]], circles: list[dict[str, Any]]) -> str:
    material = "|".join(str(path.get("d", "")) for path in paths) + "#" + "|".join(
        f"{circle.get('cx')}:{circle.get('cy')}:{circle.get('r')}" for circle in circles
    )
    return hashlib.sha256(material.encode("utf-8")).hexdigest()[:16]


def apply_procedural_graph_instance_jitter(graph: dict[str, Any], rng: Any) -> dict[str, Any]:
    """Post-envelope scale jitter so re-encode / variation_only changes remain visible."""
    paths = list(graph.get("paths") or [])
    circles = list(graph.get("circles") or [])
    if not paths:
        return graph
    cx, cy = float(OPTICAL_TARGET[0]), float(OPTICAL_TARGET[1])
    pct = 92 + (rng._next() % 9)  # 92–100% — upscaling jitter escapes mask post Phase C-A
    factor = pct / 100.0
    new_paths: list[dict[str, Any]] = []
    for row in paths:
        new_row = dict(row)
        new_row["d"] = scale_path_d(str(row.get("d", "")), cx, cy, factor)
        if isinstance(row.get("stroke_width"), (int, float)):
            sw = float(row["stroke_width"]) * (0.94 + (rng._next() % 13) / 100.0)
            new_row["stroke_width"] = round(max(2.0, min(3.2, sw)), 2)
        new_paths.append(new_row)
    out = dict(graph)
    out["paths"] = new_paths
    if circles:
        out["circles"] = circles
    out["signature"] = _graph_signature(new_paths, circles)
    return out


def normalize_procedural_graph_envelope(graph: dict[str, Any]) -> dict[str, Any]:
    """Optical lock + ghost-shield occupancy scale + mask containment."""
    graph = normalize_procedural_graph_optical_center(graph)
    paths = list(graph.get("paths") or [])
    circles = list(graph.get("circles") or [])
    cx, cy = float(OPTICAL_TARGET[0]), float(OPTICAL_TARGET[1])
    polygon = ghost_shield_polygon(cx, cy)

    points = _content_points(paths, circles)
    if not points:
        out = dict(graph)
        out["envelope_id"] = GHOST_SHIELD_ENVELOPE_ID
        return out

    target_longest = _HERO_FOCAL_TARGET_LONGEST
    already_normalized = graph.get("envelope_id") == GHOST_SHIELD_ENVELOPE_ID
    content_longest = _longest_content_edge(paths, circles)
    if not already_normalized and content_longest > 0.5:
        scale = max(_MIN_SCALE, min(_MAX_SCALE, target_longest / content_longest))
        paths, circles = _scale_paths(paths, circles, cx, cy, scale)

    for _ in range(14):
        points = _content_points(paths, circles)
        if _points_inside_mask(points, polygon, inset=_MASK_INSET):
            break
        paths, circles = _scale_paths(paths, circles, cx, cy, 0.92)

    paths, circles = _contain_and_uplift_focal_mass(paths, circles)

    out = dict(graph)
    out["paths"] = paths
    if circles:
        out["circles"] = circles
    else:
        out.pop("circles", None)

    composition = out.get("composition")
    comp = dict(composition) if isinstance(composition, dict) else {}
    comp["anchor"] = {"cx": OPTICAL_TARGET[0], "cy": OPTICAL_TARGET[1]}
    comp["envelope"] = {
        "id": GHOST_SHIELD_ENVELOPE_ID,
        "visible_frame": False,
    }
    out["composition"] = comp
    out["envelope_id"] = GHOST_SHIELD_ENVELOPE_ID
    out["signature"] = _graph_signature(paths, circles)
    return out


def measure_glyph_content_metrics(
    paths: list[dict[str, Any]],
    circles: list[dict[str, Any]],
) -> dict[str, float]:
    """BBox + centroid of integrated emblem ink (field + charge + circle radii)."""
    points = _parse_mass_points_from_paths(_emblem_paths(paths))
    min_x = min_y = float("inf")
    max_x = max_y = float("-inf")

    for x, y in points:
        min_x = min(min_x, x)
        max_x = max(max_x, x)
        min_y = min(min_y, y)
        max_y = max(max_y, y)

    for circle in circles:
        cx = float(circle["cx"])
        cy = float(circle["cy"])
        r = float(circle["r"])
        min_x = min(min_x, cx - r)
        max_x = max(max_x, cx + r)
        min_y = min(min_y, cy - r)
        max_y = max(max_y, cy + r)
        points.append((cx, cy))

    if not points or min_x == float("inf"):
        return {
            "width": 0.0,
            "height": 0.0,
            "centroid_x": float(OPTICAL_TARGET[0]),
            "centroid_y": float(OPTICAL_TARGET[1]),
            "point_count": 0.0,
        }

    return {
        "width": max_x - min_x,
        "height": max_y - min_y,
        "centroid_x": sum(point[0] for point in points) / len(points),
        "centroid_y": sum(point[1] for point in points) / len(points),
        "point_count": float(len(points)),
    }


def content_fits_ghost_shield(
    paths: list[dict[str, Any]],
    circles: list[dict[str, Any]],
    *,
    inset: float = _MASK_INSET,
) -> bool:
    """Match normalize_procedural_graph_envelope containment semantics."""
    polygon = ghost_shield_polygon(float(OPTICAL_TARGET[0]), float(OPTICAL_TARGET[1]))
    points = _content_points(paths, circles)
    if not points:
        return False
    return _points_inside_mask(points, polygon, inset=inset)

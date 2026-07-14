"""Lock procedural glyph ink to the 48×48 optical center (Hero preview + TV parity)."""

from __future__ import annotations

import hashlib
import re
from typing import Any

OPTICAL_TARGET: tuple[int, int] = (24, 24)

_COORD_RE = re.compile(r"(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)")


def _parse_points_from_paths(paths: list[dict[str, Any]]) -> list[tuple[float, float]]:
    points: list[tuple[float, float]] = []
    for row in paths:
        d = str(row.get("d", ""))
        for match in _COORD_RE.finditer(d):
            points.append((float(match.group(1)), float(match.group(2))))
    return points


def _graph_centroid(paths: list[dict[str, Any]], circles: list[dict[str, Any]]) -> tuple[float, float]:
    points = _parse_points_from_paths(paths)
    for circle in circles:
        points.append((float(circle["cx"]), float(circle["cy"])))
    if not points:
        return float(OPTICAL_TARGET[0]), float(OPTICAL_TARGET[1])
    sx = sum(point[0] for point in points) / len(points)
    sy = sum(point[1] for point in points) / len(points)
    return sx, sy


def translate_path_d(d: str, dx: float, dy: float) -> str:
    def repl(match: re.Match[str]) -> str:
        x = float(match.group(1)) + dx
        y = float(match.group(2)) + dy
        if abs(x - round(x)) < 1e-6 and abs(y - round(y)) < 1e-6:
            return f"{int(round(x))} {int(round(y))}"
        return f"{x:g} {y:g}"

    return _COORD_RE.sub(repl, d)


def _graph_signature(paths: list[dict[str, Any]], circles: list[dict[str, Any]]) -> str:
    material = "|".join(str(path.get("d", "")) for path in paths) + "#" + "|".join(
        f"{circle.get('cx')}:{circle.get('cy')}:{circle.get('r')}" for circle in circles
    )
    return hashlib.sha256(material.encode("utf-8")).hexdigest()[:16]


def normalize_procedural_graph_optical_center(graph: dict[str, Any]) -> dict[str, Any]:
    """Translate paths/circles so emblem centroid sits on OPTICAL_TARGET."""
    paths = list(graph.get("paths") or [])
    circles = list(graph.get("circles") or [])
    composition = graph.get("composition")

    anchor = None
    if isinstance(composition, dict):
        anchor = composition.get("anchor")
    if (
        isinstance(anchor, dict)
        and isinstance(anchor.get("cx"), (int, float))
        and isinstance(anchor.get("cy"), (int, float))
    ):
        cx, cy = float(anchor["cx"]), float(anchor["cy"])
    else:
        cx, cy = _graph_centroid(paths, circles)

    dx, dy = OPTICAL_TARGET[0] - cx, OPTICAL_TARGET[1] - cy
    if abs(dx) < 0.01 and abs(dy) < 0.01:
        return graph

    new_paths: list[dict[str, Any]] = []
    for row in paths:
        new_row = dict(row)
        new_row["d"] = translate_path_d(str(row.get("d", "")), dx, dy)
        new_paths.append(new_row)

    new_circles: list[dict[str, Any]] = []
    for row in circles:
        new_row = dict(row)
        new_row["cx"] = int(round(float(row["cx"]) + dx))
        new_row["cy"] = int(round(float(row["cy"]) + dy))
        new_circles.append(new_row)

    out = dict(graph)
    out["paths"] = new_paths
    if new_circles:
        out["circles"] = new_circles
    if isinstance(composition, dict):
        comp = dict(composition)
        comp["anchor"] = {"cx": OPTICAL_TARGET[0], "cy": OPTICAL_TARGET[1]}
        out["composition"] = comp
    out["signature"] = _graph_signature(new_paths, new_circles)
    return out

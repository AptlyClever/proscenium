"""Normalize externally authored SVG paths into the 48×48 canonical plot grid."""

from __future__ import annotations

import re
import xml.etree.ElementTree as ET
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Final

from hails.hail_glyph_envelope import scale_path_d
from hails.hail_glyph_optical import translate_path_d

CANONICAL_VIEWBOX: Final[int] = 48
HERO_MAX_EDGE: Final[float] = 26.0
OPTICAL_CX: Final[float] = 24.0
OPTICAL_CY: Final[float] = 24.0
_MIN_STROKE: Final[float] = 2.0
_DEFAULT_STROKE: Final[float] = 2.85

_COORD_RE = re.compile(r"(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)")
_SVG_NS = {"svg": "http://www.w3.org/2000/svg"}
_ROLE_ORDER: Final[tuple[str, ...]] = ("accent", "mass", "ground")
_COMBADGE_ROLES: Final[frozenset[str]] = frozenset({"accent", "mass"})


class SvgNormalizeError(ValueError):
    """Authored SVG cannot be normalized for plot import."""


@dataclass
class AuthoredPath:
    d: str
    role: str = ""
    element_id: str = ""
    stroke_width: float = _DEFAULT_STROKE
    fill: str = "none"
    fill_rule: str = ""
    opacity: float = 1.0
    fill_opacity: float = 1.0
    attrs: dict[str, str] = field(default_factory=dict)


def path_bbox(d: str) -> tuple[float, float, float, float] | None:
    pairs = _COORD_RE.findall(d)
    if not pairs:
        return None
    xs = [float(x) for x, _y in pairs]
    ys = [float(y) for _x, y in pairs]
    return min(xs), min(ys), max(xs), max(ys)


def _parse_svg_float(value: str | None, default: float) -> float:
    if value is None:
        return default
    text = str(value).strip()
    if not text:
        return default
    try:
        return float(text)
    except ValueError:
        match = re.search(r"[\d.]+", text)
        return float(match.group(0)) if match else default


def _resolve_role(element: ET.Element, index: int) -> str:
    role = (element.get("data-combadge-role") or element.get("id") or "").strip().lower()
    if role == "backing":
        role = "accent"
    if role == "delta":
        role = "mass"
    if role in _ROLE_ORDER:
        return role
    return _ROLE_ORDER[min(index, len(_ROLE_ORDER) - 1)]


def parse_authored_svg_paths(source: str | bytes | Path) -> list[AuthoredPath]:
    """Extract path elements from an SVG document."""
    if isinstance(source, Path):
        text = source.read_text(encoding="utf-8")
    elif isinstance(source, bytes):
        text = source.decode("utf-8")
    else:
        text = source
    root = ET.fromstring(text)
    rows: list[AuthoredPath] = []
    elements = root.findall(".//svg:path", _SVG_NS) + root.findall(".//path")
    for index, element in enumerate(elements):
        d = (element.get("d") or "").strip()
        if not d:
            continue
        fill_raw = (element.get("fill") or "none").strip()
        rows.append(
            AuthoredPath(
                d=d,
                role=_resolve_role(element, index),
                element_id=(element.get("id") or "").strip(),
                stroke_width=_parse_svg_float(element.get("stroke-width"), _DEFAULT_STROKE),
                fill=fill_raw,
                fill_rule=(element.get("fill-rule") or "").strip(),
                opacity=_parse_svg_float(element.get("opacity"), 1.0),
                fill_opacity=_parse_svg_float(element.get("fill-opacity"), 1.0),
                attrs={
                    k: v
                    for k, v in element.attrib.items()
                    if k
                    in {
                        "id",
                        "data-combadge-role",
                        "stroke-linecap",
                        "stroke-linejoin",
                    }
                },
            )
        )
    if not rows:
        raise SvgNormalizeError("SVG contains no path elements with d attributes")
    return rows


def union_path_bbox(paths: list[AuthoredPath]) -> tuple[float, float, float, float]:
    boxes = [path_bbox(row.d) for row in paths]
    boxes = [box for box in boxes if box is not None]
    if not boxes:
        raise SvgNormalizeError("Could not compute ink bounds from path coordinates")
    min_x = min(box[0] for box in boxes)
    min_y = min(box[1] for box in boxes)
    max_x = max(box[2] for box in boxes)
    max_y = max(box[3] for box in boxes)
    if max_x <= min_x or max_y <= min_y:
        raise SvgNormalizeError("Path ink bounds are degenerate")
    return min_x, min_y, max_x, max_y


def _fit_scale(min_x: float, min_y: float, max_x: float, max_y: float) -> float:
    width = max_x - min_x
    height = max_y - min_y
    longest = max(width, height)
    if longest <= 0:
        raise SvgNormalizeError("Cannot fit zero-area content to canonical grid")
    if longest <= HERO_MAX_EDGE + 1e-6:
        return 1.0
    return HERO_MAX_EDGE / longest


def normalize_authored_paths(
    paths: list[AuthoredPath],
    *,
    max_paths: int | None = None,
    required_roles: frozenset[str] | None = None,
) -> list[AuthoredPath]:
    """Scale and translate path geometry into the 48×48 hero optical box."""
    if max_paths is not None and len(paths) != max_paths:
        raise SvgNormalizeError(
            f"Expected exactly {max_paths} paths after Inkscape merge; got {len(paths)}. "
            "Merge shapes in Inkscape (Path → Union) and tag roles before import."
        )

    min_x, min_y, max_x, max_y = union_path_bbox(paths)
    src_cx = (min_x + max_x) / 2.0
    src_cy = (min_y + max_y) / 2.0
    factor = _fit_scale(min_x, min_y, max_x, max_y)

    normalized: list[AuthoredPath] = []
    scaled_rows: list[tuple[AuthoredPath, str]] = []
    for row in paths:
        scaled_d = scale_path_d(row.d, src_cx, src_cy, factor)
        scaled_rows.append((row, scaled_d))

    scaled_boxes = [path_bbox(d) for _row, d in scaled_rows]
    scaled_boxes = [box for box in scaled_boxes if box is not None]
    if not scaled_boxes:
        raise SvgNormalizeError("Could not compute scaled ink bounds")
    sc_min_x = min(box[0] for box in scaled_boxes)
    sc_min_y = min(box[1] for box in scaled_boxes)
    sc_max_x = max(box[2] for box in scaled_boxes)
    sc_max_y = max(box[3] for box in scaled_boxes)
    scaled_cx = (sc_min_x + sc_max_x) / 2.0
    scaled_cy = (sc_min_y + sc_max_y) / 2.0
    dx = OPTICAL_CX - scaled_cx
    dy = OPTICAL_CY - scaled_cy

    for row, scaled_d in scaled_rows:
        final_d = translate_path_d(scaled_d, dx, dy)
        sw = max(_MIN_STROKE, round(row.stroke_width * factor, 2))
        normalized.append(
            AuthoredPath(
                d=final_d,
                role=row.role,
                element_id=row.element_id,
                stroke_width=sw,
                fill=row.fill,
                fill_rule=row.fill_rule,
                opacity=row.opacity,
                fill_opacity=row.fill_opacity,
                attrs=dict(row.attrs),
            )
        )

    if required_roles:
        roles = {row.role for row in normalized}
        missing = required_roles - roles
        if missing:
            raise SvgNormalizeError(
                f"Missing required path roles: {', '.join(sorted(missing))}. "
                "Set data-combadge-role on each path in Inkscape."
            )

    for row in normalized:
        box = path_bbox(row.d)
        if not box:
            continue
        if box[0] < -0.5 or box[1] < -0.5 or box[2] > CANONICAL_VIEWBOX + 0.5 or box[3] > CANONICAL_VIEWBOX + 0.5:
            raise SvgNormalizeError(
                "Normalized path extends outside 0–48 grid; simplify Inkscape art or reduce margins"
            )

    normalized.sort(key=lambda row: _ROLE_ORDER.index(row.role) if row.role in _ROLE_ORDER else 99)
    return normalized


def _map_fill_for_export(row: AuthoredPath) -> tuple[str, float]:
    fill_raw = (row.fill or "none").strip()
    if fill_raw.lower() in {"", "none"}:
        return "none", round(min(1.0, max(0.0, row.opacity)), 2)
    opacity = round(min(1.0, max(0.0, row.opacity * row.fill_opacity)), 2)
    return "currentColor", opacity


def render_normalized_svg(paths: list[AuthoredPath], *, title: str = "normalized-glyph") -> str:
    """Emit plot SoT SVG with viewBox 0 0 48 48."""
    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {CANONICAL_VIEWBOX} {CANONICAL_VIEWBOX}" fill="none">',
        f"  <title>{title}</title>",
    ]
    for row in paths:
        fill, opacity = _map_fill_for_export(row)
        element_id = row.element_id or row.role or "path"
        attrs = [
            f'id="{element_id}"',
            f'data-combadge-role="{row.role}"' if row.role else "",
            f'd="{row.d}"',
            'stroke="currentColor"',
            f'stroke-width="{row.stroke_width:g}"',
            f'fill="{fill}"',
            'stroke-linecap="round"',
            'stroke-linejoin="round"',
            f'opacity="{opacity:g}"',
        ]
        if fill == "currentColor" and row.fill_opacity < 1.0:
            attrs.append(f'fill-opacity="{row.fill_opacity:g}"')
        if row.fill_rule:
            attrs.append(f'fill-rule="{row.fill_rule}"')
        lines.append(f"  <path {' '.join(a for a in attrs if a)}/>")
    lines.append("</svg>")
    lines.append("")
    return "\n".join(lines)


def normalize_svg_document(
    source: str | bytes | Path,
    *,
    max_paths: int | None = None,
    required_roles: frozenset[str] | None = None,
    title: str = "normalized-glyph",
) -> str:
    """Parse, fit to hero box, and return normalized SVG text."""
    paths = parse_authored_svg_paths(source)
    normalized = normalize_authored_paths(
        paths,
        max_paths=max_paths,
        required_roles=required_roles,
    )
    return render_normalized_svg(normalized, title=title)


def normalize_svg_file(
    source: Path,
    dest: Path,
    *,
    max_paths: int | None = None,
    required_roles: frozenset[str] | None = None,
    title: str = "normalized-glyph",
) -> str:
    svg = normalize_svg_document(
        source,
        max_paths=max_paths,
        required_roles=required_roles,
        title=title,
    )
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(svg, encoding="utf-8")
    return svg


def combadge_import_options() -> dict[str, Any]:
    return {
        "max_paths": 2,
        "required_roles": _COMBADGE_ROLES,
        "title": "combadge-tng-traced",
    }


def import_options_for_recipe(recipe_id: str) -> dict[str, Any]:
    if recipe_id == "char_combadge_delta_v1":
        return combadge_import_options()
    return {"max_paths": None, "required_roles": None, "title": f"subject-{recipe_id}"}

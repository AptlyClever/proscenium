"""Tests for authored SVG → 48×48 normalize import."""

from __future__ import annotations

import pytest

from hails.glyph_svg_normalize import (
    CANONICAL_VIEWBOX,
    OPTICAL_CX,
    OPTICAL_CY,
    SvgNormalizeError,
    normalize_authored_paths,
    normalize_svg_document,
    parse_authored_svg_paths,
    path_bbox,
    union_path_bbox,
)


def _large_combadge_svg() -> str:
    return """<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800">
  <path id="backing" data-combadge-role="accent" fill="currentColor" stroke-width="40"
    d="M 200 520 C 200 420 320 380 400 380 C 480 380 600 420 600 520 C 600 620 480 660 400 660 C 320 660 200 620 200 520 Z"/>
  <path id="delta" data-combadge-role="mass" fill="currentColor" stroke-width="45"
    d="M 400 120 C 520 160 600 280 620 420 C 640 520 600 600 520 660 L 560 760 C 480 700 440 660 400 620 C 360 660 320 700 240 760 L 280 660 C 200 600 160 520 180 420 C 200 280 280 160 400 120 Z"/>
</svg>"""


def test_parse_authored_paths_roles() -> None:
    paths = parse_authored_svg_paths(_large_combadge_svg())
    assert len(paths) == 2
    roles = {row.role for row in paths}
    assert roles == {"accent", "mass"}


def test_normalize_fits_hero_box_and_centers() -> None:
    paths = parse_authored_svg_paths(_large_combadge_svg())
    normalized = normalize_authored_paths(paths, max_paths=2, required_roles=frozenset({"accent", "mass"}))
    min_x, min_y, max_x, max_y = union_path_bbox(normalized)
    width = max_x - min_x
    height = max_y - min_y
    assert max(width, height) <= 26.01
    cx = (min_x + max_x) / 2.0
    cy = (min_y + max_y) / 2.0
    assert abs(cx - OPTICAL_CX) < 0.6
    assert abs(cy - OPTICAL_CY) < 0.6
    assert min_x >= -0.5
    assert min_y >= -0.5
    assert max_x <= CANONICAL_VIEWBOX + 0.5
    assert max_y <= CANONICAL_VIEWBOX + 0.5


def test_normalize_scales_stroke_width() -> None:
    paths = parse_authored_svg_paths(_large_combadge_svg())
    normalized = normalize_authored_paths(paths, max_paths=2)
    assert all(row.stroke_width >= 2.0 for row in normalized)
    assert normalized[0].stroke_width < paths[0].stroke_width


def test_rejects_extra_paths_for_combadge() -> None:
    svg = """<svg xmlns="http://www.w3.org/2000/svg">
      <path data-combadge-role="accent" d="M 0 0 L 100 0 L 100 100 Z"/>
      <path data-combadge-role="mass" d="M 10 10 L 90 10 L 50 90 Z"/>
      <path data-combadge-role="ground" d="M 20 20 L 80 20 L 50 80 Z"/>
    </svg>"""
    with pytest.raises(SvgNormalizeError, match="Expected exactly 2 paths"):
        normalize_svg_document(svg, max_paths=2)


def test_rejects_missing_roles() -> None:
    svg = """<svg xmlns="http://www.w3.org/2000/svg">
      <path data-combadge-role="accent" d="M 0 0 L 200 0 L 200 200 Z"/>
      <path data-combadge-role="accent" d="M 50 50 L 150 50 L 100 150 Z"/>
    </svg>"""
    with pytest.raises(SvgNormalizeError, match="Missing required path roles"):
        normalize_svg_document(
            svg,
            max_paths=2,
            required_roles=frozenset({"accent", "mass"}),
        )


def test_already_canonical_skips_scale() -> None:
    svg = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
      <path data-combadge-role="accent" stroke-width="2.5" d="M 10 30 L 38 30 L 38 36 L 10 36 Z"/>
      <path data-combadge-role="mass" stroke-width="2.85" d="M 24 8 L 34 28 L 24 24 L 14 28 Z"/>
    </svg>"""
    out = normalize_svg_document(svg, max_paths=2, required_roles=frozenset({"accent", "mass"}))
    paths = parse_authored_svg_paths(out)
    accent = next(row for row in paths if row.role == "accent")
    assert path_bbox(accent.d) is not None

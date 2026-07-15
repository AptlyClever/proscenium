"""Tests for combadge reference trace and TV accent simplification."""

from __future__ import annotations

import pytest

from hails.hail_glyph_tv_projection import project_procedural_graph_for_google_tv


def test_tv_projection_strips_combadge_grille() -> None:
    graph = {
        "version": 1,
        "generator_id": "char_combadge_delta_v1",
        "paths": [
            {
                "d": "M0 0 L10 0 L10 10 Z M2 2 L4 2 L4 4 Z",
                "role": "accent",
                "fill_rule": "evenodd",
                "stroke_width": 2.2,
            },
            {"d": "M24 4 L40 40 L8 40 Z", "role": "mass", "stroke_width": 2.4},
        ],
    }
    tv = project_procedural_graph_for_google_tv(graph)
    accent = tv["paths"][0]
    assert accent["d"] == "M0 0 L10 0 L10 10 Z"
    assert "fill_rule" not in accent


def test_trace_combadge_reference_produces_two_paths() -> None:
    from hails.glyph_combadge_reference_trace import trace_combadge_reference_to_svg

    svg = trace_combadge_reference_to_svg()
    assert 'data-combadge-role="accent"' in svg
    assert 'viewBox="0 0 48 48"' in svg
    assert svg.count("<path") == 2
    assert len(svg) < 4000

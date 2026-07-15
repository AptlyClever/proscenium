"""Tests for hero path roles and TV shadow merge."""

from __future__ import annotations

from hails.hail_glyph_hero_quality import verify_dual_profile_castable_lead
from hails.hail_glyph_path_roles import (
    PATH_ROLE_CHARGE,
    PATH_ROLE_SHADOW,
    annotate_path_roles,
    append_shadow_duplicate_paths,
    apply_canonical_depth_pass,
    merge_shadow_layers_for_tv,
)
from hails.hail_glyph_procedural import generate_procedural_graph
from hails.hail_glyph_tv_projection import project_procedural_graph_for_google_tv
import hashlib


def test_apply_canonical_depth_pass_adds_shadow_role() -> None:
    paths = [
        {"d": "M10 10 L30 30", "stroke_width": 2.8, "opacity": 1.0},
        {"d": "M12 28 L28 12", "stroke_width": 2.2, "opacity": 0.58},
    ]
    depth = apply_canonical_depth_pass(paths)
    roles = {row.get("role") for row in depth}
    assert PATH_ROLE_CHARGE in roles
    assert PATH_ROLE_SHADOW in roles
    assert len(depth) >= 3


def test_tv_projection_merges_shadow_layers() -> None:
    canonical = {
        "version": 1,
        "signature": "shadow-merge-v1",
        "paths": [
            {"d": "M8 8 L40 40", "role": "ground", "stroke_width": 2.0, "opacity": 0.55},
            {"d": "M10 10 L30 30", "role": "charge", "stroke_width": 2.8, "opacity": 1.0},
            {
                "d": "M10 10 L30 30",
                "role": "shadow",
                "stroke_width": 3.4,
                "opacity": 0.42,
            },
        ],
    }
    projected = project_procedural_graph_for_google_tv(canonical)
    assert len(projected["paths"]) == 2
    charge = next(row for row in projected["paths"] if row.get("d") == "M10 10 L30 30")
    assert float(charge["opacity"]) > 1.0 - 1e-6


def test_generate_procedural_graph_dual_profile_castable_lead() -> None:
    digest = hashlib.sha256(b"dual-profile").digest()
    graph, _ = generate_procedural_graph(
        glyph_name="Dual profile",
        hail_name="",
        seed=42,
        digest=digest,
    )
    tv = project_procedural_graph_for_google_tv(graph)
    assert verify_dual_profile_castable_lead(graph, tv) == []

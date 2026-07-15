"""Tests for ghost-shield glyph envelope normalization."""

from __future__ import annotations

import hashlib

from hails.hail_glyph_envelope import (
    GHOST_SHIELD_ENVELOPE_ID,
    ghost_shield_polygon,
    normalize_procedural_graph_envelope,
    _content_points,
    _point_in_polygon,
)
from hails.hail_glyph_procedural import generate_procedural_graph


def _digest(*parts: str) -> bytes:
    return hashlib.sha256("|".join(parts).encode("utf-8")).digest()


def test_ghost_shield_polygon_is_centered() -> None:
    poly = ghost_shield_polygon(24, 24)
    xs = [p[0] for p in poly]
    ys = [p[1] for p in poly]
    assert min(xs) < 24 < max(xs)
    assert min(ys) < 24 < max(ys)


def test_normalize_sets_envelope_metadata() -> None:
    graph = {
        "version": 1,
        "paths": [{"d": "M10 10 L30 30", "stroke": "currentColor"}],
        "circles": [],
    }
    normalized = normalize_procedural_graph_envelope(graph)
    assert normalized["envelope_id"] == GHOST_SHIELD_ENVELOPE_ID
    envelope = normalized.get("composition", {}).get("envelope")
    assert isinstance(envelope, dict)
    assert envelope.get("id") == GHOST_SHIELD_ENVELOPE_ID
    assert envelope.get("visible_frame") is False


def test_generate_procedural_graph_fits_ghost_shield() -> None:
    digest = _digest("Envelope", "fit")
    polygon = ghost_shield_polygon()
    for seed in range(1, 20):
        graph, _ = generate_procedural_graph(glyph_name="Envelope", hail_name="", seed=seed, digest=digest)
        assert graph.get("envelope_id") == GHOST_SHIELD_ENVELOPE_ID
        paths = list(graph.get("paths") or [])
        circles = list(graph.get("circles") or [])
        points = _content_points(paths, circles)
        assert points
        assert all(_point_in_polygon(point, polygon) for point in points)


def test_seed_changes_signature_without_variation_only() -> None:
    digest = _digest("TryAnother", "")
    signatures = {
        generate_procedural_graph(glyph_name="TryAnother", hail_name="", seed=s, digest=digest)[0]["signature"]
        for s in range(1, 24)
    }
    assert len(signatures) >= 8

"""Tests for procedural glyph optical center normalization."""

from __future__ import annotations

import hashlib

from hails.hail_glyph_optical import OPTICAL_TARGET, normalize_procedural_graph_optical_center
from hails.hail_glyph_procedural import generate_procedural_graph


def _digest(*parts: str) -> bytes:
    return hashlib.sha256("|".join(parts).encode("utf-8")).digest()


def test_normalize_moves_centroid_to_optical_target() -> None:
    graph = {
        "version": 1,
        "paths": [{"d": "M10 10 L30 30", "stroke": "currentColor"}],
        "circles": [],
    }
    normalized = normalize_procedural_graph_optical_center(graph)
    assert normalized["paths"][0]["d"] == "M14 14 L34 34"


def test_generate_procedural_graph_anchor_locked() -> None:
    digest = _digest("Optical", "lock")
    for seed in range(1, 12):
        graph, _ = generate_procedural_graph(glyph_name="Optical", hail_name="", seed=seed, digest=digest)
        composition = graph.get("composition")
        if isinstance(composition, dict) and isinstance(composition.get("anchor"), dict):
            assert composition["anchor"]["cx"] == OPTICAL_TARGET[0]
            assert composition["anchor"]["cy"] == OPTICAL_TARGET[1]


def test_variation_only_keeps_locked_anchor_after_normalize() -> None:
    digest = _digest("Locked", "anchor")
    first, _ = generate_procedural_graph(glyph_name="Locked", hail_name="", seed=1, digest=digest)
    recipe = first["generator_id"]
    for seed in range(1, 10):
        graph, _ = generate_procedural_graph(
            glyph_name="Locked",
            hail_name="",
            seed=seed,
            digest=digest,
            glyph_family_id=recipe,
            variation_only=True,
        )
        anchor = graph.get("composition", {}).get("anchor")
        assert isinstance(anchor, dict)
        assert anchor.get("cx") == OPTICAL_TARGET[0]
        assert anchor.get("cy") == OPTICAL_TARGET[1]

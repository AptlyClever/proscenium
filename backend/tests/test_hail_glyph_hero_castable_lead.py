"""Castable lead quality — slot catalog + Forge generation path."""

from __future__ import annotations

import hashlib

from hails.hail_glyph_hero_quality import verify_procedural_graph_castable_lead
from hails.hail_glyph_procedural import generate_procedural_graph
from hails.hail_glyph_slots import SLOT_RECIPE_IDS


def _digest(*parts: str) -> bytes:
    return hashlib.sha256("|".join(parts).encode("utf-8")).digest()


def test_all_slot_recipes_castable_lead_via_forge_pipeline() -> None:
    """Each slot grammar must produce a castable lead through generate_procedural_graph."""
    digest = _digest("hero", "slot-catalog")
    failures: list[str] = []
    for recipe_id in SLOT_RECIPE_IDS:
        for seed in (1, 7, 42):
            graph, _bucket = generate_procedural_graph(
                glyph_name="Hero",
                hail_name="",
                seed=seed,
                digest=digest,
                glyph_family_id=recipe_id,
                variation_only=True,
            )
            errors = verify_procedural_graph_castable_lead(graph)
            if errors:
                failures.append(f"{recipe_id} seed={seed}: {', '.join(errors)}")
    assert not failures, "\n".join(failures[:12])


def test_forge_slot_seeds_pass_castable_lead() -> None:
    digest = _digest("Forge", "Hero")
    failures: list[str] = []
    for seed in range(1, 33):
        graph, _bucket = generate_procedural_graph(
            glyph_name="Beacon",
            hail_name="",
            seed=seed,
            digest=digest,
            glyph_family_id="slot_orb_star",
            variation_only=True,
        )
        errors = verify_procedural_graph_castable_lead(graph)
        if errors:
            failures.append(f"seed={seed}: {', '.join(errors)}")
    assert not failures, "\n".join(failures[:8])


def test_compose_ring_flame_generation_castable_lead() -> None:
    digest = _digest("Star", "Trek")
    graph, _bucket = generate_procedural_graph(
        glyph_name="Star Trek",
        hail_name="",
        seed=472995227,
        digest=digest,
        glyph_family_id="compose_ring_flame",
        variation_only=True,
    )
    errors = verify_procedural_graph_castable_lead(graph)
    assert errors == [], errors

"""Subject recipe registry tests."""

from __future__ import annotations

from hails.hail_glyph_combadge import COMBADGE_DELTA_V1
from hails.hail_glyph_subject_registry import (
    build_plot_fixture_from_recipe,
    list_active_recipes,
    recipe_metadata,
    resolve_recipe_id,
)


def test_list_active_recipes_includes_combadge() -> None:
    ids = {row["recipe_id"] for row in list_active_recipes()}
    assert COMBADGE_DELTA_V1 in ids


def test_resolve_recipe_id_keywords() -> None:
    assert resolve_recipe_id("Fleet Combadge", "") == COMBADGE_DELTA_V1
    assert resolve_recipe_id("Guardian", "") == "char_chunky_guardian_v1"


def test_build_plot_fixture_from_recipe() -> None:
    fixture = build_plot_fixture_from_recipe(COMBADGE_DELTA_V1)
    assert fixture["plot_id"] == "custom-combadge-plot"
    assert fixture["proof_mode"] is True
    assert fixture["recipe_id"] == COMBADGE_DELTA_V1
    meta = recipe_metadata(COMBADGE_DELTA_V1)
    assert meta is not None
    assert meta["lead_phrase"] == "delta combadge"

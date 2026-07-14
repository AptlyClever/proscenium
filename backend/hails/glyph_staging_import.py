"""Promote staged SVG assets into plot fixtures (representation layer intake)."""

from __future__ import annotations

import shutil
from pathlib import Path
from typing import Any

from hails.glyph_asset_staging import STAGED_ASSET_PREFIX, validate_staged_asset_ref
from hails.glyph_plot_store import plot_fixture_detail, plot_fixtures_dir, save_plot_fixture
from hails.hail_glyph_subject_registry import build_plot_fixture_from_recipe, recipe_metadata
from settings import _resolve_repo_root


class StagingImportError(ValueError):
    def __init__(self, message: str):
        super().__init__(message)
        self.errors = [{"path": "/asset_ref", "message": message}]


def _repo_root() -> Path:
    return _resolve_repo_root()


def resolve_staged_asset_path(asset_ref: str) -> Path:
    errors = validate_staged_asset_ref(asset_ref)
    if errors:
        raise StagingImportError(errors[0]["message"])
    path = _repo_root() / asset_ref.strip()
    if not path.is_file():
        raise StagingImportError(f"staged asset not found: {asset_ref}")
    return path


def promote_staged_glyph_to_plot(
    *,
    asset_ref: str,
    recipe_id: str,
    plot_id: str | None = None,
) -> dict[str, Any]:
    """Copy staged SVG into plot assets and regenerate plot fixture."""
    meta = recipe_metadata(recipe_id)
    if not meta:
        raise StagingImportError(f"unknown recipe_id: {recipe_id}")

    staged = resolve_staged_asset_path(asset_ref)
    suffix = staged.suffix.lower()
    if suffix != ".svg":
        raise StagingImportError("v001 staging import supports SVG assets only")

    fixture = build_plot_fixture_from_recipe(recipe_id)
    target_plot_id = (plot_id or fixture.get("plot_id") or "").strip()
    if not target_plot_id:
        raise StagingImportError("plot_id could not be resolved")

    traced = fixture.get("traced_svg")
    if traced:
        dest = plot_fixtures_dir() / "assets" / str(traced)
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(staged, dest)
    elif asset_ref.startswith(STAGED_ASSET_PREFIX):
        dest = plot_fixtures_dir() / "assets" / staged.name
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(staged, dest)
        fixture["traced_svg"] = staged.name

    if recipe_id == "char_combadge_delta_v1":
        from hails.hail_glyph_combadge import write_combadge_plot_fixture

        write_combadge_plot_fixture()
        return plot_fixture_detail(target_plot_id)

    fixture = build_plot_fixture_from_recipe(recipe_id)
    fixture["plot_id"] = target_plot_id
    return save_plot_fixture(target_plot_id, fixture)

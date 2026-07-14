"""Import externally authored SVG into plot fixtures (normalize → SoT → fixture)."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from hails.glyph_plot_store import plot_fixture_detail, plot_fixtures_dir
from hails.glyph_svg_normalize import SvgNormalizeError, import_options_for_recipe, normalize_svg_document
from hails.hail_glyph_subject_registry import build_plot_fixture_from_recipe, recipe_metadata


def regenerate_plot_fixture_from_recipe(recipe_id: str) -> Path:
    if recipe_id == "char_combadge_delta_v1":
        from hails.hail_glyph_combadge import write_combadge_plot_fixture

        return write_combadge_plot_fixture()

    fixture = build_plot_fixture_from_recipe(recipe_id)
    plot_id = str(fixture["plot_id"])
    out = plot_fixtures_dir() / f"{plot_id}.fixture.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(fixture, indent=2) + "\n", encoding="utf-8")
    return out


def import_authored_svg_for_recipe(
    recipe_id: str,
    svg_text: str,
    *,
    normalize: bool = True,
) -> dict[str, Any]:
    """Normalize authored SVG, write traced asset, regenerate fixture, return plot detail."""
    meta = recipe_metadata(recipe_id)
    if not meta:
        raise ValueError(f"unknown recipe_id: {recipe_id}")

    fixture = build_plot_fixture_from_recipe(recipe_id)
    plot_id = str(fixture.get("plot_id") or "").strip()
    if not plot_id:
        raise ValueError("recipe has no plot_id")

    traced = str(fixture.get("traced_svg") or "").strip()
    if not traced or "/" in traced or ".." in traced:
        raise ValueError("recipe plot binding has no traced_svg asset")

    dest = plot_fixtures_dir() / "assets" / traced
    dest.parent.mkdir(parents=True, exist_ok=True)

    if normalize:
        opts = import_options_for_recipe(recipe_id)
        try:
            normalized = normalize_svg_document(svg_text, **opts)
        except SvgNormalizeError:
            raise
    else:
        normalized = svg_text

    dest.write_text(normalized, encoding="utf-8")

    if recipe_id == "char_combadge_delta_v1":
        from hails.hail_glyph_combadge import write_combadge_plot_fixture

        write_combadge_plot_fixture()
    else:
        regenerate_plot_fixture_from_recipe(recipe_id)

    return plot_fixture_detail(plot_id)


def import_authored_svg_for_plot(
    plot_id: str,
    svg_text: str,
    *,
    normalize: bool = True,
) -> dict[str, Any]:
    from hails.glyph_plot_store import load_plot_fixture_by_id

    fixture = load_plot_fixture_by_id(plot_id)
    recipe_id = str(fixture.get("recipe_id") or "").strip()
    if not recipe_id:
        raise ValueError("plot fixture has no recipe_id")
    detail = import_authored_svg_for_recipe(recipe_id, svg_text, normalize=normalize)
    if str(detail.get("plot_id")) != plot_id:
        raise ValueError(f"recipe plot_id mismatch for {plot_id}")
    return detail

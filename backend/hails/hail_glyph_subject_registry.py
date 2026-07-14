"""Subject recipe registry — L3 representation layer catalog.

Maps subject intent (combadge, guardian, …) to authored render modules.
See docs/hails/glyph-subject-recipe-v001.md.
"""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any, Final, Protocol

from hails.hail_glyph_combadge import COMBADGE_DELTA_V1, combadge_keywords_match, render_combadge_recipe
from hails.hail_glyph_character import (
    HERO_GLYPH_PROOF_FAMILY_ID,
    HERO_GLYPH_PROOF_LEAD_PHRASE,
    render_character_recipe,
)
from hails.hail_glyph_procedural import PROCEDURAL_GRAPH_VERSION, _GlyphRng, _graph_signature
from settings import _resolve_repo_root

_RECIPE_DIR: Final[str] = "config/hails/subject-recipes"
_SCHEMA: Final[str] = "subject_recipe_v1"

_RENDER_FNS: dict[str, Any] = {
    "render_combadge_recipe": render_combadge_recipe,
    "render_character_recipe": render_character_recipe,
}


class _RecipeRng(_GlyphRng):
    pass


def subject_recipes_dir() -> Path:
    return _resolve_repo_root() / _RECIPE_DIR


@lru_cache(maxsize=1)
def _load_recipe_rows() -> tuple[dict[str, Any], ...]:
    root = subject_recipes_dir()
    if not root.is_dir():
        return ()
    rows: list[dict[str, Any]] = []
    for path in sorted(root.glob("*.recipe.json")):
        raw = json.loads(path.read_text(encoding="utf-8"))
        if isinstance(raw, dict) and raw.get("schema") == _SCHEMA:
            rows.append(raw)
    return tuple(rows)


def list_active_recipes() -> list[dict[str, Any]]:
    return [row for row in _load_recipe_rows() if row.get("status") == "active"]


def recipe_metadata(recipe_id: str) -> dict[str, Any] | None:
    needle = (recipe_id or "").strip()
    for row in _load_recipe_rows():
        if row.get("recipe_id") == needle:
            return dict(row)
    return None


def _keyword_match(recipe: dict[str, Any], glyph_name: str, hail_name: str) -> bool:
    import re

    tokens = set(re.findall(r"[a-z0-9]+", f"{glyph_name} {hail_name}".lower()))
    triggers = recipe.get("keyword_triggers") or []
    if not isinstance(triggers, list):
        return False
    return bool(tokens & {str(t).lower() for t in triggers})


def resolve_recipe_id(
    glyph_name: str = "",
    hail_name: str = "",
    explicit_family: str | None = None,
) -> str | None:
    """Keyword match → recipe; explicit family when registered; else operator default."""
    explicit = (explicit_family or "").strip()
    if explicit:
        if recipe_metadata(explicit):
            return explicit
        return None

    active = list_active_recipes()
    for row in active:
        if _keyword_match(row, glyph_name, hail_name):
            return str(row["recipe_id"])

    for row in active:
        if row.get("operator_default") is True:
            return str(row["recipe_id"])

    return None


def render_recipe(
    recipe_id: str,
    rng: _GlyphRng | None = None,
    *,
    variation_only: bool = False,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]], dict[str, Any]]:
    meta = recipe_metadata(recipe_id)
    if not meta:
        raise KeyError(recipe_id)
    module = meta.get("module") if isinstance(meta.get("module"), dict) else {}
    render_fn_name = str(module.get("render_fn") or "").strip()
    render_fn = _RENDER_FNS.get(render_fn_name)
    if not render_fn:
        raise ValueError(f"unknown render_fn for recipe {recipe_id}: {render_fn_name}")
    engine = rng or _RecipeRng(b"subject-recipe", seed=0)
    return render_fn(recipe_id, engine, variation_only=variation_only)


def build_recipe_authored_graph(
    recipe_id: str,
    *,
    variation_only: bool = False,
) -> dict[str, Any]:
    paths, circles, composition = render_recipe(recipe_id, variation_only=variation_only)
    graph: dict[str, Any] = {
        "version": PROCEDURAL_GRAPH_VERSION,
        "generator_id": recipe_id,
        "paths": paths,
        "composition": composition,
        "signature": _graph_signature(paths, circles),
    }
    if circles:
        graph["circles"] = circles
    return graph


def build_plot_fixture_from_recipe(recipe_id: str) -> dict[str, Any]:
    meta = recipe_metadata(recipe_id)
    if not meta:
        raise KeyError(recipe_id)
    plot = meta.get("plot") if isinstance(meta.get("plot"), dict) else {}
    graph = build_recipe_authored_graph(recipe_id, variation_only=False)
    return {
        "plot_id": plot.get("plot_id") or f"{recipe_id}-plot",
        "glyph_id": plot.get("glyph_id") or f"custom-{recipe_id.replace('char_', '').replace('_v1', '')}",
        "label": meta.get("lead_phrase") or recipe_id,
        "subject_phrase": plot.get("subject_phrase") or meta.get("lead_phrase") or recipe_id,
        "proof_mode": True,
        "recipe_id": recipe_id,
        "reference_asset": _reference_asset_for_recipe(meta),
        "traced_svg": _traced_svg_for_recipe(meta),
        "procedural_graph": graph,
    }


def _reference_asset_for_recipe(meta: dict[str, Any]) -> str | None:
    plot = meta.get("plot") if isinstance(meta.get("plot"), dict) else {}
    if plot.get("reference_asset"):
        return str(plot["reference_asset"])
    if meta.get("recipe_id") == COMBADGE_DELTA_V1:
        return "combadge-tng-reference.png"
    return None


def _traced_svg_for_recipe(meta: dict[str, Any]) -> str | None:
    plot = meta.get("plot") if isinstance(meta.get("plot"), dict) else {}
    if plot.get("traced_svg"):
        return str(plot["traced_svg"])
    if meta.get("recipe_id") == COMBADGE_DELTA_V1:
        return "combadge-tng-traced.svg"
    return None


def guardian_recipe_row() -> dict[str, Any]:
    return {
        "schema": _SCHEMA,
        "recipe_id": HERO_GLYPH_PROOF_FAMILY_ID,
        "status": "active",
        "kind": "character",
        "lead_phrase": HERO_GLYPH_PROOF_LEAD_PHRASE,
        "character_type": "mascot-character",
        "character_id": "chunky_guardian",
        "keyword_triggers": ["guardian", "mascot", "chunky"],
        "operator_default": False,
        "variation_policy": {
            "stroke_jitter": True,
            "coordinate_jitter": False,
            "envelope_jitter": False,
            "instance_jitter": False,
            "focal_uplift": False,
            "depth_shadow_pass": True,
            "proof_mode_required_for_register": False,
        },
        "composition": {
            "schema": "char_v1",
            "path_roles": ["mass", "ground", "accent"],
            "max_primary_paths": 3,
        },
        "module": {
            "python": "hail_glyph_character",
            "render_fn": "render_character_recipe",
        },
    }

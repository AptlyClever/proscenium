"""Plot fixture discovery and verification for in-app Glyph Plot surface."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from hails.glyph_plot_verify import load_plot_fixture, run_plot_verify, verify_plot_fixture, write_plot_strip
from settings import _resolve_repo_root

_PLOT_FIXTURES_DIR = _resolve_repo_root() / "config/hails/plot-fixtures"


def plot_fixtures_dir() -> Path:
    return _PLOT_FIXTURES_DIR


def list_plot_fixture_ids() -> list[str]:
    if not _PLOT_FIXTURES_DIR.is_dir():
        return []
    return sorted(
        path.stem.replace(".fixture", "")
        for path in _PLOT_FIXTURES_DIR.glob("*.fixture.json")
    )


def plot_fixture_path(plot_id: str) -> Path:
    needle = (plot_id or "").strip()
    if not needle or "/" in needle or ".." in needle:
        raise KeyError(needle)
    path = _PLOT_FIXTURES_DIR / f"{needle}.fixture.json"
    if not path.is_file():
        raise KeyError(needle)
    return path


def load_plot_fixture_by_id(plot_id: str) -> dict[str, Any]:
    return load_plot_fixture(plot_fixture_path(plot_id))


def plot_fixture_summary(plot_id: str) -> dict[str, Any]:
    fixture = load_plot_fixture_by_id(plot_id)
    verify = verify_plot_fixture(fixture)
    graph = fixture.get("procedural_graph") if isinstance(fixture.get("procedural_graph"), dict) else {}
    return {
        "plot_id": fixture.get("plot_id") or plot_id,
        "glyph_id": fixture.get("glyph_id"),
        "label": fixture.get("label"),
        "subject_phrase": fixture.get("subject_phrase"),
        "proof_mode": fixture.get("proof_mode") is True,
        "generator_id": graph.get("generator_id"),
        "path_count": len(graph.get("paths") or []),
        "verify": {
            "valid": verify["valid"],
            "heuristic_errors": verify["heuristic_errors"],
            "metric_errors": verify["metric_errors"],
            "longest_edge_dp": verify["longest_edge_dp"],
            "tv_path_count": verify["tv_path_count"],
        },
    }


def plot_fixture_reference_path(plot_id: str) -> Path:
    fixture = load_plot_fixture_by_id(plot_id)
    asset = str(fixture.get("reference_asset") or "").strip()
    if not asset or "/" in asset or ".." in asset:
        raise KeyError(plot_id)
    path = _PLOT_FIXTURES_DIR / "assets" / asset
    if not path.is_file():
        raise KeyError(plot_id)
    return path


def _plot_fixture_glyph_renders(fixture: dict[str, Any]) -> dict[str, Any]:
    """Consumer-path glyph_render blocks for honest Plot judgment (TV vs canonical)."""
    from hails.hails_glyph_render import resolve_glyph_render

    glyph_id = str(fixture.get("glyph_id") or "custom-plot").strip()
    graph = fixture.get("procedural_graph")
    if not isinstance(graph, dict):
        return {"glyph_render_canonical": None, "glyph_render_tv": None}
    custom_glyphs = {
        glyph_id: {
            "glyph_id": glyph_id,
            "label": fixture.get("label") or glyph_id,
            "procedural_graph": graph,
            "proof_mode": fixture.get("proof_mode") is True,
        }
    }
    return {
        "glyph_render_canonical": resolve_glyph_render(
            glyph_id,
            custom_glyphs=custom_glyphs,
            consumer_id="axiom_authoring",
        ),
        "glyph_render_tv": resolve_glyph_render(
            glyph_id,
            custom_glyphs=custom_glyphs,
            consumer_id="google_tv_apk",
        ),
    }


def plot_fixture_detail(plot_id: str) -> dict[str, Any]:
    fixture = load_plot_fixture_by_id(plot_id)
    summary = plot_fixture_summary(plot_id)
    reference_asset = str(fixture.get("reference_asset") or "").strip()
    reference_url = None
    if reference_asset:
        reference_url = f"/api/hails/glyph-plot/fixtures/{plot_id}/reference.png"
    renders = _plot_fixture_glyph_renders(fixture)
    return {
        **summary,
        "reference_asset": reference_asset or None,
        "reference_url": reference_url,
        "traced_svg": fixture.get("traced_svg"),
        "recipe_id": fixture.get("recipe_id"),
        "procedural_graph": fixture.get("procedural_graph"),
        **renders,
    }


def save_plot_fixture(plot_id: str, body: dict[str, Any]) -> dict[str, Any]:
    """Persist authored plot fixture (Plot Editor v0 export path)."""
    needle = (plot_id or "").strip()
    if not needle or "/" in needle or ".." in needle:
        raise KeyError(needle)
    graph = body.get("procedural_graph")
    if not isinstance(graph, dict):
        raise ValueError("procedural_graph required")
    existing = load_plot_fixture_by_id(plot_id)
    fixture: dict[str, Any] = {
        **existing,
        **{
            k: v
            for k, v in body.items()
            if k
            in {
                "glyph_id",
                "label",
                "subject_phrase",
                "reference_asset",
                "traced_svg",
                "recipe_id",
                "procedural_graph",
            }
        },
        "plot_id": needle,
        "proof_mode": True,
    }
    verify = verify_plot_fixture(fixture)
    if not verify["valid"]:
        raise ValueError(
            "; ".join(verify["heuristic_errors"] + verify["metric_errors"]) or "plot fixture invalid"
        )
    path = plot_fixture_path(plot_id)
    path.write_text(json.dumps(fixture, indent=2) + "\n", encoding="utf-8")
    write_plot_strip(fixture, _PLOT_FIXTURES_DIR / f"{needle}.strip.svg")
    return plot_fixture_detail(plot_id)


def plot_fixture_strip_svg(plot_id: str) -> str:
    fixture = load_plot_fixture_by_id(plot_id)
    out = write_plot_strip(fixture, _PLOT_FIXTURES_DIR / f"{plot_id}.strip.svg")
    return out.read_text(encoding="utf-8")


def regenerate_all_plot_strips() -> None:
    for plot_id in list_plot_fixture_ids():
        fixture = load_plot_fixture_by_id(plot_id)
        write_plot_strip(fixture, _PLOT_FIXTURES_DIR / f"{plot_id}.strip.svg")

"""Project canonical procedural graphs for Google TV overlay delivery.

See docs/hails/tv-glyph-parity-tiered-delivery-v001.md.
"""

from __future__ import annotations

import copy
import re
from typing import Any, Final

from hails.hail_glyph_path_roles import merge_shadow_layers_for_tv, trim_paths_by_role

GOOGLE_TV_PROJECTION_ID: Final[str] = "google_tv_v1"
MAX_TV_PATHS: Final[int] = 8
CONSUMER_GOOGLE_TV_APK: Final[str] = "google_tv_apk"
CONSUMER_AXIOM_AUTHORING: Final[str] = "axiom_authoring"
CONSUMER_HTML_PREVIEW: Final[str] = "html_preview"


def normalize_consumer_id(raw: str | None) -> str:
    value = (raw or CONSUMER_GOOGLE_TV_APK).strip().lower()
    if value in {CONSUMER_GOOGLE_TV_APK, "google_tv"}:
        return CONSUMER_GOOGLE_TV_APK
    if value in {CONSUMER_AXIOM_AUTHORING, "authoring", "axiom_paintbox", "forge"}:
        return CONSUMER_AXIOM_AUTHORING
    if value in {CONSUMER_HTML_PREVIEW, "html", "preview"}:
        return CONSUMER_HTML_PREVIEW
    return CONSUMER_GOOGLE_TV_APK


def _circle_to_filled_path(row: dict[str, Any]) -> dict[str, Any]:
    cx = float(row["cx"])
    cy = float(row["cy"])
    r = float(row["r"])
    fill = str(row.get("fill") or "currentColor")
    opacity = float(row.get("opacity", 0.9))
    d = (
        f"M{cx - r:.3f} {cy:.3f} "
        f"a{r:.3f} {r:.3f} 0 1 0 {2 * r:.3f} 0 "
        f"a{r:.3f} {r:.3f} 0 1 0 {-2 * r:.3f} 0"
    )
    return {
        "d": d,
        "fill": fill,
        "stroke_width": 0.0,
        "opacity": opacity,
    }


def _normalize_path_row(row: dict[str, Any]) -> dict[str, Any]:
    out: dict[str, Any] = {
        "d": str(row.get("d") or "").strip(),
        "stroke_width": float(row.get("stroke_width", 2.5)),
        "opacity": float(row.get("opacity", 1.0)),
    }
    fill = row.get("fill")
    if isinstance(fill, str) and fill.strip().lower() not in {"", "none"}:
        out["fill"] = fill.strip()
    stroke = row.get("stroke")
    if isinstance(stroke, str) and stroke.strip():
        out["stroke"] = stroke.strip()
    for key in ("stroke_linecap", "stroke_linejoin", "fill_rule"):
        value = row.get(key)
        if isinstance(value, str) and value.strip():
            out[key] = value.strip()
    role = row.get("role")
    if isinstance(role, str) and role.strip():
        out["role"] = role.strip()
    return out


def _trim_paths(paths: list[dict[str, Any]], *, max_paths: int) -> list[dict[str, Any]]:
    return trim_paths_by_role(paths, max_paths=max_paths)


def _merge_shadow_layers(paths: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return merge_shadow_layers_for_tv(paths)


def _simplify_combadge_accent_for_tv(row: dict[str, Any]) -> dict[str, Any]:
    """Drop grille cutouts from accent path — solid oval reads at 24dp."""
    if str(row.get("role") or "") != "accent":
        return row
    d = str(row.get("d") or "").strip()
    if not d:
        return row
    inner = re.search(r"\s+M", d)
    if not inner:
        return row
    out = dict(row)
    out["d"] = d[: inner.start()].strip()
    out.pop("fill_rule", None)
    return out


def project_procedural_graph_for_google_tv(graph: dict[str, Any]) -> dict[str, Any]:
    """Return a TV-safe procedural graph derived from the canonical graph."""
    canonical = copy.deepcopy(graph)
    paths = [
        _normalize_path_row(row)
        for row in canonical.get("paths", [])
        if isinstance(row, dict) and str(row.get("d") or "").strip()
    ]
    if str(canonical.get("generator_id") or "") == "char_combadge_delta_v1":
        paths = [_simplify_combadge_accent_for_tv(row) for row in paths]
    circles = canonical.get("circles")
    if isinstance(circles, list):
        for row in circles:
            if isinstance(row, dict) and all(key in row for key in ("cx", "cy", "r")):
                paths.append(_circle_to_filled_path(row))

    paths = _merge_shadow_layers(paths)
    paths = _trim_paths(paths, max_paths=MAX_TV_PATHS)
    projected: dict[str, Any] = {
        "version": canonical.get("version", 1),
        "paths": paths,
        "generator_id": canonical.get("generator_id"),
        "signature": _projected_signature(canonical.get("signature")),
    }
    return projected


def _projected_signature(source: Any) -> str | None:
    if not isinstance(source, str) or not source.strip():
        return None
    base = source.strip()
    if base.endswith("-tv"):
        return base
    return f"{base}-tv"


def projection_metadata(canonical_graph: dict[str, Any], projected_graph: dict[str, Any]) -> dict[str, Any]:
    return {
        "projection_id": GOOGLE_TV_PROJECTION_ID,
        "source_signature": canonical_graph.get("signature"),
        "projected_signature": projected_graph.get("signature"),
    }

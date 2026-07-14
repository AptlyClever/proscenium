"""Hero Glyph quality gates — castable lead + enriched package delivery.

Castable lead metrics implement glyph-hero-intent-v001 §2 (focal mass, optical anchor, TV legibility).
Package gates ensure procedural glyph_render on enriched hail packages.
"""

from __future__ import annotations

from typing import Any

from hails.hail_glyph_composition import is_valid_composition
from hails.hail_glyph_envelope import (
    GHOST_SHIELD_ENVELOPE_ID,
    content_fits_ghost_shield,
    measure_glyph_content_metrics,
    normalize_procedural_graph_envelope,
)
from hails.hail_glyph_optical import OPTICAL_TARGET
from hails.hail_glyph_procedural import is_valid_procedural_graph
from hails.hail_glyph_tv_projection import project_procedural_graph_for_google_tv
from hails.hails_glyph_render import is_google_tv_glyph_deliverable, resolve_glyph_render

_HERO_GRAMMAR_PREFIXES = ("slot_", "compose_", "icon_", "char_", "place_", "person_")

# glyph-hero-intent-v001 §2 — hero ink fits ~26×26 optical box inside ghost shield
_FOCAL_MAX_EDGE = 28.0
_FOCAL_MIN_EDGE = 20.0  # pso-20260619-axiom-glyph-hero-achievement-path GHAP4
_CENTROID_TOLERANCE = 4.5
_MIN_CHARGE_STROKE = 2.0
_MIN_PATH_COUNT = 2


def _trim(value: Any) -> str:
    return value.strip() if isinstance(value, str) else ""


def _charge_paths(paths: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [row for row in paths if float(row.get("opacity", 1.0)) > 0.5]


def _graph_for_hero_metrics(graph: dict[str, Any]) -> dict[str, Any]:
    """Use pipeline-enveloped ink as-is; normalize only raw procedural graphs."""
    if graph.get("envelope_id") == GHOST_SHIELD_ENVELOPE_ID:
        return dict(graph)
    return normalize_procedural_graph_envelope(dict(graph))


def verify_procedural_graph_hero_focal_floor(graph: dict[str, Any]) -> list[str]:
    """Return failures when normalized ink bbox is below hero focal mass floor (GHAP4)."""
    errors: list[str] = []
    if not is_valid_procedural_graph(graph):
        errors.append("procedural_graph invalid")
        return errors

    normalized = _graph_for_hero_metrics(graph)
    paths = list(normalized.get("paths") or [])
    circles = list(normalized.get("circles") or [])

    metrics = measure_glyph_content_metrics(paths, circles)
    longest = max(metrics["width"], metrics["height"])
    if longest < _FOCAL_MIN_EDGE:
        errors.append(
            f"focal mass below hero optical floor ({longest:.1f}dp < {_FOCAL_MIN_EDGE}dp)"
        )

    if normalized.get("envelope_id") != GHOST_SHIELD_ENVELOPE_ID:
        errors.append("missing ghost_shield_v1 envelope normalization")

    return errors


def verify_procedural_graph_castable_lead(graph: dict[str, Any]) -> list[str]:
    """Return failures when procedural ink is not a castable Hero Glyph lead."""
    errors: list[str] = []
    if not is_valid_procedural_graph(graph):
        errors.append("procedural_graph invalid")
        return errors

    normalized = _graph_for_hero_metrics(graph)
    paths = list(normalized.get("paths") or [])
    circles = list(normalized.get("circles") or [])

    if not is_valid_composition(paths, circles):
        errors.append("composition fails integrated structure gate")

    charges = _charge_paths(paths)
    if not charges:
        errors.append("missing charge ink (opacity > 0.5)")

    if len(paths) < _MIN_PATH_COUNT:
        errors.append("need field + charge paths (minimum 2)")

    max_charge_sw = max((float(row.get("stroke_width", 0)) for row in charges), default=0.0)
    if max_charge_sw < _MIN_CHARGE_STROKE:
        errors.append(f"charge stroke_width below TV legibility floor ({_MIN_CHARGE_STROKE})")

    composition = normalized.get("composition")
    anchor = composition.get("anchor") if isinstance(composition, dict) else None
    if isinstance(anchor, dict) and isinstance(anchor.get("cx"), (int, float)) and isinstance(anchor.get("cy"), (int, float)):
        if abs(float(anchor["cx"]) - float(OPTICAL_TARGET[0])) > _CENTROID_TOLERANCE:
            errors.append("composition anchor off optical center")
        if abs(float(anchor["cy"]) - float(OPTICAL_TARGET[1])) > _CENTROID_TOLERANCE:
            errors.append("composition anchor off optical center")
    else:
        metrics = measure_glyph_content_metrics(paths, circles)
        ox, oy = float(OPTICAL_TARGET[0]), float(OPTICAL_TARGET[1])
        if abs(metrics["centroid_x"] - ox) > _CENTROID_TOLERANCE:
            errors.append("centroid_x off optical anchor")
        if abs(metrics["centroid_y"] - oy) > _CENTROID_TOLERANCE:
            errors.append("centroid_y off optical anchor")

    if not content_fits_ghost_shield(paths, circles):
        errors.append("ink escapes ghost_shield_v1 occupancy mask")
    else:
        metrics = measure_glyph_content_metrics(paths, circles)
        longest = max(metrics["width"], metrics["height"])
        if longest > _FOCAL_MAX_EDGE:
            errors.append("focal mass exceeds hero optical box")

    if normalized.get("envelope_id") != GHOST_SHIELD_ENVELOPE_ID:
        errors.append("missing ghost_shield_v1 envelope normalization")

    return errors


def verify_glyph_spec_hero_quality(
    spec: dict[str, Any],
    *,
    require_focal_floor: bool = True,
) -> list[str]:
    """Return human-readable failures for a custom glyph spec."""
    errors: list[str] = []
    glyph_id = _trim(spec.get("glyph_id"))
    if not glyph_id.startswith("custom-"):
        errors.append("hero glyph must use custom-* id")
        return errors

    graph = spec.get("procedural_graph")
    if not is_valid_procedural_graph(graph):
        errors.append("procedural_graph invalid or missing")
        return errors

    errors.extend(verify_procedural_graph_castable_lead(graph))
    if require_focal_floor:
        errors.extend(verify_procedural_graph_hero_focal_floor(graph))

    family = _trim(graph.get("generator_id") or spec.get("glyph_family_id"))
    if family and not any(family.startswith(prefix) for prefix in _HERO_GRAMMAR_PREFIXES):
        errors.append(f"generator_id {family!r} is not a hero grammar family")

    glyph_render = resolve_glyph_render(glyph_id, custom_glyphs={glyph_id: spec})
    if glyph_render.get("kind") != "procedural":
        errors.append("glyph_render must be procedural for hero custom glyphs")
    elif not is_google_tv_glyph_deliverable(glyph_render):
        errors.append("glyph_render not Google TV deliverable")

    return errors


def verify_enriched_package_hero_quality(
    payload: dict[str, Any],
    *,
    hail_record: dict[str, Any] | None = None,
    custom_glyphs: dict[str, dict[str, Any]] | None = None,
) -> list[str]:
    """Return failures for an enriched consumer render payload."""
    errors: list[str] = []
    glyph_id = _trim(payload.get("glyph_id"))
    if glyph_id == "default":
        errors.append("hero packages must not use registry default glyph")

    glyph_render = payload.get("glyph_render")
    if not isinstance(glyph_render, dict):
        library = custom_glyphs or {}
        glyph_render = resolve_glyph_render(glyph_id, custom_glyphs=library)
    if glyph_render.get("kind") != "procedural":
        errors.append("enriched payload glyph_render must be procedural")
    elif not is_google_tv_glyph_deliverable(glyph_render):
        errors.append("enriched payload glyph_render not TV deliverable")

    layout_regions = payload.get("layout_regions")
    if not isinstance(layout_regions, dict):
        errors.append("layout_regions missing on enriched payload")
    else:
        glyph_focus = layout_regions.get("glyph_focus")
        if not isinstance(glyph_focus, dict):
            errors.append("layout_regions.glyph_focus required")

    if hail_record is not None:
        package = hail_record.get("hail_package")
        if isinstance(package, dict) and package.get("catalog_ready") is not True:
            errors.append("hail_package.catalog_ready must be true")

        spec = (custom_glyphs or {}).get(glyph_id)
        if isinstance(spec, dict):
            errors.extend(verify_glyph_spec_hero_quality(spec))
        elif glyph_id.startswith("custom-"):
            graph = (glyph_render or {}).get("procedural_graph")
            if isinstance(graph, dict):
                errors.extend(verify_procedural_graph_castable_lead(graph))
                errors.extend(verify_procedural_graph_hero_focal_floor(graph))

    return errors


def assert_enriched_package_hero_quality(
    payload: dict[str, Any],
    *,
    hail_record: dict[str, Any] | None = None,
    custom_glyphs: dict[str, dict[str, Any]] | None = None,
) -> None:
    errors = verify_enriched_package_hero_quality(
        payload,
        hail_record=hail_record,
        custom_glyphs=custom_glyphs,
    )
    if errors:
        raise AssertionError("; ".join(errors))


def assert_castable_lead_graph(graph: dict[str, Any]) -> None:
    errors = verify_procedural_graph_castable_lead(graph)
    if errors:
        raise AssertionError("; ".join(errors))


def assert_hero_focal_floor_graph(graph: dict[str, Any]) -> None:
    errors = verify_procedural_graph_hero_focal_floor(graph)
    if errors:
        raise AssertionError("; ".join(errors))


def verify_dual_profile_castable_lead(
    canonical_graph: dict[str, Any],
    tv_graph: dict[str, Any] | None = None,
) -> list[str]:
    """Return failures when canonical or TV-projected graphs miss castable-lead."""
    errors: list[str] = []
    projected = tv_graph or project_procedural_graph_for_google_tv(canonical_graph)
    for label, graph in (("canonical", canonical_graph), ("tv", projected)):
        for err in verify_procedural_graph_castable_lead(graph):
            errors.append(f"{label}: {err}")
        for err in verify_procedural_graph_hero_focal_floor(graph):
            errors.append(f"{label}: {err}")
    return errors


def hero_quality_validation_errors(
    spec: dict[str, Any],
    *,
    require_focal_floor: bool = True,
) -> list[dict[str, str]]:
    """Map hero verifier failures to composer validation_errors shape."""
    return [
        {"path": "/procedural_graph", "message": message}
        for message in verify_glyph_spec_hero_quality(spec, require_focal_floor=require_focal_floor)
    ]


def verify_glyph_thumbnail_distinctiveness(
    spec: dict[str, Any],
    peer_specs: list[dict[str, Any]],
) -> list[str]:
    """Return failures when a glyph duplicates another fleet mark at thumbnail distance."""
    from hails.hail_glyph_procedural import is_valid_procedural_graph

    graph = spec.get("procedural_graph")
    if not is_valid_procedural_graph(graph):
        return []
    glyph_id = str(spec.get("glyph_id") or "").strip()
    signature = str(graph.get("signature") or "").strip()
    if not signature:
        return []
    errors: list[str] = []
    for peer in peer_specs:
        if not isinstance(peer, dict):
            continue
        peer_id = str(peer.get("glyph_id") or "").strip()
        if not peer_id or peer_id == glyph_id or peer.get("archived") is True:
            continue
        peer_graph = peer.get("procedural_graph")
        if not is_valid_procedural_graph(peer_graph):
            continue
        peer_sig = str(peer_graph.get("signature") or "").strip()
        if peer_sig != signature:
            continue
        peer_label = str(peer.get("label") or peer_id).strip()
        errors.append(f'thumbnail signature matches existing glyph "{peer_label}" ({peer_id})')
    return errors


def distinctiveness_validation_errors(
    spec: dict[str, Any],
    peer_specs: list[dict[str, Any]],
) -> list[dict[str, str]]:
    """Map thumbnail distinctiveness failures to composer validation_errors shape."""
    return [
        {"path": "/procedural_graph", "message": message}
        for message in verify_glyph_thumbnail_distinctiveness(spec, peer_specs)
    ]

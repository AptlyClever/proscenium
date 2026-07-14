"""Hails Composer v001 — custom glyph specs and deterministic seeding.

Product-facing composer flow; does not mutate production registry JSON or
contact overlay/runtime devices.
"""

from __future__ import annotations

import copy
import hashlib
import re
import unicodedata
from datetime import datetime, timezone
from typing import Any

from hails.glyph_registry import hail_glyph_allowlist
from hails.hail_glyph_image_asset import normalize_image_layers, validate_image_layers
from hails.hail_glyph_character import HERO_GLYPH_PROOF_FAMILY_ID
from hails.hail_glyph_operator_seed import OPERATOR_SHAPED_DEFAULT_FAMILY
from hails.hail_glyph_hero_quality import (
    distinctiveness_validation_errors,
    hero_quality_validation_errors,
    verify_glyph_spec_hero_quality,
)
from hails.hail_glyph_procedural import (
    _normalize_seed,
    generate_procedural_graph,
    is_valid_procedural_graph,
    is_valid_procedural_motif_id,
)
from hails.hails_domain import (
    KNOWN_EFFECT_IDS,
    KNOWN_PALETTE_IDS,
    KNOWN_SIZE_TIERS,
    create_hail,
)
from schemas import AxiomStoredSettings

CUSTOM_GLYPH_PREFIX = "custom-"
TRANSITION_STYLES: tuple[str, ...] = ("fade", "slide_up", "pulse", "beam")
SPEED_TIERS: tuple[str, ...] = ("slow", "normal", "fast")
CONTRACT_GLYPH_FALLBACK = "✦"

_GLYPH_ID_RE = re.compile(r"^custom-[a-z0-9][a-z0-9-]*$")
HERO_SEED_MAX_ATTEMPTS = 24
HERO_SEED_RETRY_STEP = 17


class ComposerValidationError(ValueError):
    def __init__(self, errors: list[dict[str, str]]):
        self.errors = errors
        super().__init__("; ".join(e["message"] for e in errors))


def _trimmed(value: Any) -> str:
    return value.strip() if isinstance(value, str) else ""


def _now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def custom_glyphs_from_settings(st: AxiomStoredSettings) -> dict[str, dict[str, Any]]:
    raw = getattr(st, "custom_glyphs", None)
    if not isinstance(raw, dict):
        return {}
    out: dict[str, dict[str, Any]] = {}
    for key, value in raw.items():
        glyph_id = _trimmed(key)
        if glyph_id and isinstance(value, dict):
            out[glyph_id] = copy.deepcopy(value)
    return out


def merge_custom_glyph_overlays(
    base: dict[str, dict[str, Any]] | None,
    overlay: Any,
) -> dict[str, dict[str, Any]]:
    """Merge request-time draft glyphs (Forge authoring) onto persisted library."""
    merged = copy.deepcopy(base or {})
    if isinstance(overlay, dict):
        items = overlay.items()
    elif isinstance(overlay, list):
        items = (
            (spec.get("glyph_id"), spec)
            for spec in overlay
            if isinstance(spec, dict) and _trimmed(spec.get("glyph_id"))
        )
    else:
        return merged
    for key, value in items:
        glyph_id = _trimmed(key)
        if glyph_id and isinstance(value, dict):
            merged[glyph_id] = copy.deepcopy(value)
    return merged


def effective_hail_glyph_allowlist_for_custom(
    custom_glyphs: dict[str, dict[str, Any]],
) -> tuple[str, ...]:
    registry = hail_glyph_allowlist()
    merged: list[str] = list(registry)
    for glyph_id in sorted(custom_glyphs.keys()):
        if glyph_id not in merged:
            merged.append(glyph_id)
    return tuple(merged)


def effective_hail_glyph_allowlist(st: AxiomStoredSettings) -> tuple[str, ...]:
    return effective_hail_glyph_allowlist_for_custom(custom_glyphs_from_settings(st))


def slugify_custom_glyph_id(name: str, existing: set[str]) -> str:
    base = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode()
    base = re.sub(r"[^a-z0-9]+", "-", base.lower()).strip("-") or "glyph"
    candidate = f"{CUSTOM_GLYPH_PREFIX}{base}"
    if candidate not in existing and _GLYPH_ID_RE.match(candidate):
        return candidate
    for n in range(2, 1000):
        numbered = f"{CUSTOM_GLYPH_PREFIX}{base}-{n}"
        if numbered not in existing and _GLYPH_ID_RE.match(numbered):
            return numbered
    raise ComposerValidationError([{"path": "/glyph_id", "message": "could not allocate custom glyph id"}])


def _seed_bytes(*parts: str, seed: int | None = None) -> bytes:
    text = "|".join(parts) + (f"|{seed}" if seed is not None else "")
    return hashlib.sha256(text.encode("utf-8")).digest()


def _compose_glyph_spec_candidate(
    *,
    glyph_name: str,
    hail_name: str,
    seed: int | None,
    scale: str | None,
    palette_id: str | None,
    effect_id: str | None,
    resolved_glyph_id: str,
    glyph_family_id: str | None,
    variation_only: bool,
    remix: bool,
    attempt: int,
    base_digest: bytes,
) -> dict[str, Any]:
    attempt_seed = seed
    if attempt > 0:
        base = seed if seed is not None else int.from_bytes(base_digest[:4], "big")
        attempt_seed = _normalize_seed(base + HERO_SEED_RETRY_STEP * attempt)
    digest = _seed_bytes(glyph_name, hail_name, seed=attempt_seed) if attempt_seed is not None else base_digest
    transition = TRANSITION_STYLES[digest[3] % len(TRANSITION_STYLES)]
    speed = SPEED_TIERS[digest[4] % len(SPEED_TIERS)]
    procedural_graph, semantic_bucket = generate_procedural_graph(
        glyph_name=glyph_name,
        hail_name=hail_name,
        seed=attempt_seed,
        digest=base_digest,
        glyph_family_id=glyph_family_id,
        variation_only=variation_only,
        remix=remix,
    )
    animation_enabled = digest[6] % 5 != 0
    effect_for_spec = effect_id if animation_enabled else "none"
    duration_ms = {"slow": 7000, "normal": 5000, "fast": 3500}[speed]
    family_id = str(procedural_graph.get("generator_id") or "").strip()
    return normalize_custom_glyph_spec(
        {
            "glyph_id": resolved_glyph_id,
            "label": glyph_name,
            "source": "composer",
            "glyph_family_id": family_id,
            "procedural_graph": procedural_graph,
            "semantic_bucket": semantic_bucket,
            "fallback_emoji": CONTRACT_GLYPH_FALLBACK,
            "animation_enabled": animation_enabled,
            "speed_tier": speed,
            "transition_style": transition,
            "visual": {
                "effect_id": effect_for_spec,
                "palette_id": palette_id,
                "scale": scale,
                "duration_ms": duration_ms,
                "placement_id": "upper_center",
                "placement_mode": "preset",
            },
            "seed": attempt_seed if attempt_seed is not None else int.from_bytes(digest[:4], "big"),
        }
    )


def build_fixture_glyph_spec(
    *,
    glyph_name: str,
    hail_name: str = "",
    seed: int | None = None,
    scale: str | None = None,
    palette_id: str | None = None,
    effect_id: str | None = None,
    existing_ids: set[str] | None = None,
    glyph_family_id: str | None = None,
    variation_only: bool = True,
    remix: bool = False,
    glyph_id: str | None = None,
) -> dict[str, Any]:
    """Delivery/test fixture — same pipeline as seed-glyph without hero gate (not operator §4)."""
    name = _trimmed(glyph_name) or _trimmed(hail_name) or "Glyph"
    base_digest = _seed_bytes(name, hail_name, seed=None)
    palette = _trimmed(palette_id) if _trimmed(palette_id) in KNOWN_PALETTE_IDS else "axiom_dark_cyan"
    effect = _trimmed(effect_id) if _trimmed(effect_id) in KNOWN_EFFECT_IDS else "transporter"
    scale_tier = _trimmed(scale) if _trimmed(scale) in KNOWN_SIZE_TIERS else "medium"
    existing = existing_ids or set()
    preserved_id = _trimmed(glyph_id)
    if preserved_id.startswith(CUSTOM_GLYPH_PREFIX) and _GLYPH_ID_RE.match(preserved_id):
        resolved_glyph_id = preserved_id
    else:
        resolved_glyph_id = slugify_custom_glyph_id(name, existing)
    resolved_family = _trimmed(glyph_family_id) or OPERATOR_SHAPED_DEFAULT_FAMILY
    spec = _compose_glyph_spec_candidate(
        glyph_name=name,
        hail_name=hail_name,
        seed=seed,
        scale=scale_tier,
        palette_id=palette,
        effect_id=effect,
        resolved_glyph_id=resolved_glyph_id,
        glyph_family_id=resolved_family,
        variation_only=variation_only,
        remix=remix,
        attempt=0,
        base_digest=base_digest,
    )
    spec["source"] = "delivery_fixture"
    return spec


def seed_glyph_spec(
    *,
    glyph_name: str,
    hail_name: str = "",
    seed: int | None = None,
    scale: str | None = None,
    palette_id: str | None = None,
    effect_id: str | None = None,
    existing_ids: set[str] | None = None,
    glyph_family_id: str | None = None,
    variation_only: bool = False,
    remix: bool = False,
    glyph_id: str | None = None,
) -> dict[str, Any]:
    name = _trimmed(glyph_name) or _trimmed(hail_name) or "Glyph"
    base_digest = _seed_bytes(name, hail_name, seed=None)
    palette = _trimmed(palette_id) if _trimmed(palette_id) in KNOWN_PALETTE_IDS else "axiom_dark_cyan"
    effect = _trimmed(effect_id) if _trimmed(effect_id) in KNOWN_EFFECT_IDS else "transporter"
    scale_tier = _trimmed(scale) if _trimmed(scale) in KNOWN_SIZE_TIERS else "medium"
    existing = existing_ids or set()
    preserved_id = _trimmed(glyph_id)
    if preserved_id.startswith(CUSTOM_GLYPH_PREFIX) and _GLYPH_ID_RE.match(preserved_id):
        resolved_glyph_id = preserved_id
    else:
        resolved_glyph_id = slugify_custom_glyph_id(name, existing)

    last_hero_errors: list[str] = []
    for attempt in range(HERO_SEED_MAX_ATTEMPTS):
        candidate = _compose_glyph_spec_candidate(
            glyph_name=name,
            hail_name=hail_name,
            seed=seed,
            scale=scale_tier,
            palette_id=palette,
            effect_id=effect,
            resolved_glyph_id=resolved_glyph_id,
            glyph_family_id=glyph_family_id,
            variation_only=variation_only,
            remix=remix,
            attempt=attempt,
            base_digest=base_digest,
        )
        last_hero_errors = verify_glyph_spec_hero_quality(candidate)
        if not last_hero_errors:
            return candidate

    raise ComposerValidationError(
        [{"path": "/procedural_graph", "message": message} for message in last_hero_errors]
        or [{"path": "/procedural_graph", "message": "hero glyph quality gate failed after retries"}]
    )


def normalize_custom_glyph_spec(spec: dict[str, Any]) -> dict[str, Any]:
    out = copy.deepcopy(spec)
    out["glyph_id"] = _trimmed(out.get("glyph_id"))
    out["label"] = _trimmed(out.get("label")) or out["glyph_id"]
    out["source"] = _trimmed(out.get("source")) or "composer"
    image_asset_raw = out.get("image_asset") if isinstance(out.get("image_asset"), dict) else {}
    image_path = _trimmed(image_asset_raw.get("path"))
    image_layers = normalize_image_layers(out.get("image_layers"))
    if _trimmed(out.get("representation_kind")) == "image" and (image_path or image_layers):
        out["representation_kind"] = "image"
        if image_path:
            cleaned_asset: dict[str, Any] = {"path": image_path}
            for dim in ("width", "height"):
                value = image_asset_raw.get(dim)
                if isinstance(value, (int, float)) and value > 0:
                    cleaned_asset[dim] = int(value)
            out["image_asset"] = cleaned_asset
        else:
            out.pop("image_asset", None)
        if image_layers:
            out["image_layers"] = image_layers
        else:
            out.pop("image_layers", None)
    else:
        out["representation_kind"] = "procedural"
        out.pop("image_asset", None)
    motif_id = _trimmed(out.get("procedural_motif_id"))
    if motif_id:
        out["procedural_motif_id"] = motif_id if is_valid_procedural_motif_id(motif_id) else ""
    else:
        out.pop("procedural_motif_id", None)
    graph = out.get("procedural_graph")
    if is_valid_procedural_graph(graph):
        out["procedural_graph"] = graph
    else:
        out.pop("procedural_graph", None)
    bucket = _trimmed(out.get("semantic_bucket"))
    if bucket:
        out["semantic_bucket"] = bucket
    else:
        out.pop("semantic_bucket", None)
    family = _trimmed(out.get("glyph_family_id"))
    graph_family = ""
    if is_valid_procedural_graph(out.get("procedural_graph")):
        graph_family = _trimmed((out.get("procedural_graph") or {}).get("generator_id"))
    if family or graph_family:
        out["glyph_family_id"] = family or graph_family
    else:
        out.pop("glyph_family_id", None)
    out["fallback_emoji"] = _trimmed(out.get("fallback_emoji")) or CONTRACT_GLYPH_FALLBACK
    out["animation_enabled"] = out.get("animation_enabled") is not False
    speed = _trimmed(out.get("speed_tier")) or "normal"
    out["speed_tier"] = speed if speed in SPEED_TIERS else "normal"
    transition = _trimmed(out.get("transition_style")) or "fade"
    out["transition_style"] = transition if transition in TRANSITION_STYLES else "fade"
    visual = out.get("visual") if isinstance(out.get("visual"), dict) else {}
    effect = _trimmed(visual.get("effect_id")) or "transporter"
    if not out["animation_enabled"]:
        effect = "none"
    out["visual"] = {
        "effect_id": effect,
        "palette_id": _trimmed(visual.get("palette_id")) or "axiom_dark_cyan",
        "scale": _trimmed(visual.get("scale")) or "medium",
        "duration_ms": int(visual.get("duration_ms") or {"slow": 7000, "normal": 5000, "fast": 3500}[out["speed_tier"]]),
        "placement_id": _trimmed(visual.get("placement_id")) or "upper_center",
        "placement_mode": "preset",
    }
    out["archived"] = out.get("archived") is True
    created_at = _trimmed(out.get("created_at"))
    updated_at = _trimmed(out.get("updated_at"))
    if created_at:
        out["created_at"] = created_at
    if updated_at:
        out["updated_at"] = updated_at
    return out


def _plot_path_fingerprint(graph: dict[str, Any]) -> tuple[tuple[str, str], ...]:
    paths = graph.get("paths") if isinstance(graph.get("paths"), list) else []
    primary = [
        (str(row.get("role") or ""), str(row.get("d") or "").strip())
        for row in paths
        if str(row.get("role") or "") != "shadow" and str(row.get("d") or "").strip()
    ]
    return tuple(sorted(primary))


def _proof_mode_register_errors(spec: dict[str, Any]) -> list[dict[str, str]]:
    """Block proof-mode subjects until plot fixture passes gate."""
    from hails.glyph_plot_store import list_plot_fixture_ids, load_plot_fixture_by_id
    from hails.glyph_plot_verify import verify_plot_fixture
    from hails.hail_glyph_subject_registry import recipe_metadata

    errors: list[dict[str, str]] = []
    proof_mode = spec.get("proof_mode") is True
    family = _trimmed(spec.get("glyph_family_id"))
    meta = recipe_metadata(family) if family else None
    policy = meta.get("variation_policy") if isinstance(meta, dict) else {}
    if isinstance(policy, dict) and policy.get("proof_mode_required_for_register") is True:
        proof_mode = True
    if not proof_mode:
        return errors

    glyph_id = _trimmed(spec.get("glyph_id"))
    plot_id = None
    if isinstance(meta, dict):
        plot = meta.get("plot") if isinstance(meta.get("plot"), dict) else {}
        if plot.get("glyph_id") == glyph_id:
            plot_id = _trimmed(plot.get("plot_id"))
    if not plot_id:
        for pid in list_plot_fixture_ids():
            try:
                fixture = load_plot_fixture_by_id(pid)
            except KeyError:
                continue
            if _trimmed(fixture.get("glyph_id")) == glyph_id:
                plot_id = pid
                break
    if not plot_id:
        errors.append({"path": "/proof_mode", "message": "proof_mode glyph requires matching plot fixture"})
        return errors

    fixture = load_plot_fixture_by_id(plot_id)
    recipe_id = _trimmed(fixture.get("recipe_id"))
    if family and recipe_id and family != recipe_id:
        errors.append(
            {"path": "/glyph_family_id", "message": f"glyph_family_id must match plot recipe_id ({recipe_id})"}
        )
    verify = verify_plot_fixture(fixture)
    if not verify["valid"]:
        detail = "; ".join(verify["heuristic_errors"] + verify["metric_errors"]) or "plot gate failed"
        errors.append({"path": "/procedural_graph", "message": f"plot gate must pass before register: {detail}"})
    graph = spec.get("procedural_graph")
    fixture_graph = fixture.get("procedural_graph")
    if isinstance(graph, dict) and isinstance(fixture_graph, dict):
        if _plot_path_fingerprint(graph) != _plot_path_fingerprint(fixture_graph):
            errors.append(
                {
                    "path": "/procedural_graph",
                    "message": "register paths must match plot-approved fixture geometry",
                }
            )
    return errors


def validate_custom_glyph_spec(
    spec: dict[str, Any],
    *,
    peer_glyphs: list[dict[str, Any]] | None = None,
) -> list[dict[str, str]]:
    errors: list[dict[str, str]] = []
    glyph_id = _trimmed(spec.get("glyph_id"))
    if not glyph_id:
        errors.append({"path": "/glyph_id", "message": "glyph_id is required"})
    elif not _GLYPH_ID_RE.match(glyph_id):
        errors.append({"path": "/glyph_id", "message": f"glyph_id must match {CUSTOM_GLYPH_PREFIX}<slug>"})
    elif glyph_id in hail_glyph_allowlist():
        errors.append({"path": "/glyph_id", "message": "glyph_id conflicts with registry glyph"})
    if not _trimmed(spec.get("label")):
        errors.append({"path": "/label", "message": "label is required"})
    visual = spec.get("visual") if isinstance(spec.get("visual"), dict) else {}
    effect = _trimmed(visual.get("effect_id"))
    if effect and effect not in KNOWN_EFFECT_IDS:
        errors.append({"path": "/visual/effect_id", "message": f"effect_id must be one of: {', '.join(KNOWN_EFFECT_IDS)}"})
    palette = _trimmed(visual.get("palette_id"))
    if palette and palette not in KNOWN_PALETTE_IDS:
        errors.append({"path": "/visual/palette_id", "message": f"palette_id must be one of: {', '.join(KNOWN_PALETTE_IDS)}"})
    scale = _trimmed(visual.get("scale"))
    if scale and scale not in KNOWN_SIZE_TIERS:
        errors.append({"path": "/visual/scale", "message": f"scale must be one of: {', '.join(KNOWN_SIZE_TIERS)}"})
    speed = _trimmed(spec.get("speed_tier"))
    if speed and speed not in SPEED_TIERS:
        errors.append({"path": "/speed_tier", "message": f"speed_tier must be one of: {', '.join(SPEED_TIERS)}"})
    transition = _trimmed(spec.get("transition_style"))
    if transition and transition not in TRANSITION_STYLES:
        errors.append({"path": "/transition_style", "message": f"transition_style must be one of: {', '.join(TRANSITION_STYLES)}"})
    motif_id = _trimmed(spec.get("procedural_motif_id"))
    graph = spec.get("procedural_graph")
    has_graph = is_valid_procedural_graph(graph)
    has_motif = motif_id and is_valid_procedural_motif_id(motif_id)
    if motif_id and not has_motif:
        errors.append({"path": "/procedural_motif_id", "message": "procedural_motif_id is not a supported motif"})
    if graph is not None and not has_graph:
        errors.append({"path": "/procedural_graph", "message": "procedural_graph is invalid"})
    is_image_kind = spec.get("representation_kind") == "image"
    if is_image_kind:
        from hails.hail_glyph_image_asset import glyph_image_asset_exists

        image_layers = normalize_image_layers(spec.get("image_layers"))
        if len(image_layers) >= 2:
            errors.extend(
                {"path": "/image_layers", "message": message}
                for message in validate_image_layers(image_layers)
            )
        else:
            image_asset = spec.get("image_asset") if isinstance(spec.get("image_asset"), dict) else {}
            asset_path = _trimmed(image_asset.get("path"))
            if not asset_path:
                errors.append({"path": "/image_asset/path", "message": "image_asset.path is required for representation_kind=image"})
            elif not glyph_image_asset_exists(asset_path):
                errors.append({"path": "/image_asset/path", "message": f"image asset not found on disk: {asset_path}"})
    if spec.get("source") == "composer" and not has_graph and not has_motif and not is_image_kind:
        errors.append({"path": "/procedural_graph", "message": "composer glyph requires procedural_graph, procedural_motif_id, or representation_kind=image"})
    if not errors and has_graph:
        require_focal_floor = spec.get("source") != "delivery_fixture"
        errors.extend(
            hero_quality_validation_errors(spec, require_focal_floor=require_focal_floor),
        )
        errors.extend(distinctiveness_validation_errors(spec, peer_glyphs or []))
    errors.extend(_proof_mode_register_errors(spec))
    return errors


def validate_glyph_hero_quality(body: dict[str, Any]) -> dict[str, Any]:
    """Return hero gate result for a composer glyph spec (Forge proactive check)."""
    raw = copy.deepcopy(body) if isinstance(body, dict) else {}
    peer_raw = raw.pop("peer_glyphs", None)
    peer_glyphs = peer_raw if isinstance(peer_raw, list) else []
    spec = raw
    graph = spec.get("procedural_graph")
    if not is_valid_procedural_graph(graph):
        return {
            "valid": False,
            "errors": [{"path": "/procedural_graph", "message": "procedural_graph required for hero validation"}],
        }
    if _trimmed(spec.get("glyph_id")):
        spec = normalize_custom_glyph_spec(spec)
    errors = hero_quality_validation_errors(spec)
    errors.extend(distinctiveness_validation_errors(spec, peer_glyphs))
    return {"valid": not errors, "errors": errors}


def register_custom_glyph(st: AxiomStoredSettings, spec: dict[str, Any]) -> dict[str, Any]:
    normalized = normalize_custom_glyph_spec(spec)
    peers = list(custom_glyphs_from_settings(st).values())
    errors = validate_custom_glyph_spec(normalized, peer_glyphs=peers)
    if errors:
        raise ComposerValidationError(errors)
    glyphs = custom_glyphs_from_settings(st)
    glyph_id = normalized["glyph_id"]
    existing = glyphs.get(glyph_id)
    if existing and existing != normalized and _glyph_spec_content_differs(existing, normalized):
        raise ComposerValidationError(
            [{"path": "/glyph_id", "message": f"custom glyph already exists with different spec: {glyph_id}"}]
        )
    if existing:
        normalized["created_at"] = existing.get("created_at") or _now_iso()
        normalized["archived"] = existing.get("archived") is True
    else:
        normalized["created_at"] = _now_iso()
        normalized["archived"] = False
    normalized["updated_at"] = _now_iso()
    glyphs[glyph_id] = normalized
    st.custom_glyphs = glyphs
    return normalized


def _glyph_spec_content_differs(a: dict[str, Any], b: dict[str, Any]) -> bool:
    """Ignore library metadata when comparing register payloads."""
    ignore = {"created_at", "updated_at", "archived"}
    a_body = {k: v for k, v in a.items() if k not in ignore}
    b_body = {k: v for k, v in b.items() if k not in ignore}
    return a_body != b_body


_SPEC_PATCH_FIELDS = frozenset(
    {
        "visual",
        "animation_enabled",
        "speed_tier",
        "transition_style",
        "procedural_motif_id",
        "procedural_graph",
        "fallback_emoji",
        "semantic_bucket",
        "glyph_family_id",
        "source",
        "seed",
        "representation_kind",
        "image_asset",
    }
)


def patch_custom_glyph(st: AxiomStoredSettings, glyph_id: str, patch: dict[str, Any]) -> dict[str, Any]:
    needle = _trimmed(glyph_id)
    glyphs = custom_glyphs_from_settings(st)
    existing = glyphs.get(needle)
    if not existing:
        raise KeyError(needle)
    patched_glyph_id = _trimmed(patch.get("glyph_id"))
    if patched_glyph_id and patched_glyph_id != needle:
        raise ComposerValidationError(
            [{"path": "/glyph_id", "message": "glyph_id cannot be changed via PATCH"}]
        )
    updated = copy.deepcopy(existing)
    if "label" in patch:
        label = _trimmed(patch.get("label"))
        if not label:
            raise ComposerValidationError([{"path": "/label", "message": "label is required"}])
        updated["label"] = label
    if "archived" in patch:
        updated["archived"] = patch.get("archived") is True
    for key in _SPEC_PATCH_FIELDS:
        if key in patch:
            updated[key] = patch[key]
    normalized = normalize_custom_glyph_spec(updated)
    normalized["glyph_id"] = needle
    normalized["created_at"] = existing.get("created_at") or _now_iso()
    normalized["updated_at"] = _now_iso()
    peers = [g for gid, g in custom_glyphs_from_settings(st).items() if gid != needle]
    errors = validate_custom_glyph_spec(normalized, peer_glyphs=peers)
    if errors:
        raise ComposerValidationError(errors)
    glyphs[needle] = normalized
    st.custom_glyphs = glyphs
    return normalized


def custom_glyph_catalog_entries(st: AxiomStoredSettings) -> list[dict[str, Any]]:
    entries: list[dict[str, Any]] = []
    for glyph_id, spec in sorted(custom_glyphs_from_settings(st).items()):
        entries.append(
            {
                "glyph_id": glyph_id,
                "label": spec.get("label") or glyph_id,
                "status": "archived" if spec.get("archived") is True else "custom",
                "category": "composer",
                "fallback_emoji": spec.get("fallback_emoji") or CONTRACT_GLYPH_FALLBACK,
                "procedural_motif_id": spec.get("procedural_motif_id") or "",
                "semantic_bucket": spec.get("semantic_bucket") or "",
                "semantic_intent": spec.get("semantic_bucket")
                and f"Procedural {spec.get('semantic_bucket')} mark (Axiom preview)"
                or "Composer-created glyph",
                "description": "Custom glyph created in Hails Composer",
                "source": "composer",
            }
        )
    return entries


def merge_glyph_catalog(st: AxiomStoredSettings, registry_entries: list[dict[str, Any]]) -> list[dict[str, Any]]:
    registry_ids = {_trimmed(e.get("glyph_id")) for e in registry_entries}
    custom = [e for e in custom_glyph_catalog_entries(st) if e["glyph_id"] not in registry_ids]
    return [*registry_entries, *custom]


def _hail_references_glyph(hail: dict[str, Any], glyph_id: str) -> bool:
    if hail.get("archived") is True:
        return False
    icon = hail.get("icon") if isinstance(hail.get("icon"), dict) else {}
    return _trimmed(icon.get("value")) == glyph_id


def active_custom_glyphs_for_lcard(st: AxiomStoredSettings) -> list[dict[str, Any]]:
    """Non-archived custom glyph specs for LCARD effective / glyph resolution."""
    return [
        copy.deepcopy(spec)
        for spec in custom_glyphs_from_settings(st).values()
        if isinstance(spec, dict) and spec.get("archived") is not True
    ]


def build_companion_hail_body(glyph_spec: dict[str, Any]) -> dict[str, Any]:
    """Default hail record so a saved Forge glyph is sendable from LCARD."""
    label = _trimmed(glyph_spec.get("label")) or _trimmed(glyph_spec.get("glyph_id")) or "Glyph"
    glyph_id = _trimmed(glyph_spec.get("glyph_id"))
    visual = copy.deepcopy(glyph_spec.get("visual") if isinstance(glyph_spec.get("visual"), dict) else {})
    visual.setdefault("duration_ms", 5000)
    visual["effect_id"] = "transporter"
    visual.setdefault("effect_variation_id", "voyaging")
    visual.setdefault("palette_id", "axiom_dark_cyan")
    visual.setdefault("scale", "medium")
    visual.setdefault("placement_id", "upper_center")
    visual.setdefault("placement_mode", "preset")
    route_suffix = re.sub(r"[^a-z0-9]+", "-", glyph_id.removeprefix("custom-")).strip("-") or "glyph"
    return {
        "name": label,
        "message": {"short_text": label, "variants": [label]},
        "icon": {"kind": "glyph", "value": glyph_id, "label": label},
        "category": "cute",
        "enabled": True,
        "visual": visual,
        "behavior": {
            "cooldown_sec": 30,
            "quiet_hours_policy": "respect",
            "requires_confirmation": False,
        },
        "delivery_policy": {
            "routes": [
                {
                    "id": f"route.arcade.master_bedroom.{route_suffix}",
                    "launch_room_id": "arcade",
                    "destination_room_id": "master_bedroom",
                    "provider": "lcard",
                    "requires_confirmation": False,
                    "enabled": True,
                }
            ],
        },
    }


def companion_hails_for_orphan_glyphs(
    current_hails: list[dict[str, Any]],
    custom_glyphs: dict[str, dict[str, Any]],
    *,
    glyph_allowlist: tuple[str, ...],
) -> list[dict[str, Any]]:
    """Project companion hails for active custom glyphs not yet attached to a hail."""
    companions: list[dict[str, Any]] = []
    working = list(current_hails)
    for spec in custom_glyphs.values():
        if not isinstance(spec, dict) or spec.get("archived") is True:
            continue
        glyph_id = _trimmed(spec.get("glyph_id"))
        if not glyph_id:
            continue
        if any(_hail_references_glyph(hail, glyph_id) for hail in working):
            continue
        created = create_hail(
            build_companion_hail_body(spec),
            working,
            glyph_allowlist=glyph_allowlist,
            custom_glyphs=custom_glyphs,
        )
        working.append(created)
        companions.append(created)
    return companions


def materialize_orphan_companion_hails(
    st: AxiomStoredSettings,
    *,
    glyph_allowlist: tuple[str, ...],
) -> list[dict[str, Any]]:
    """Persist companion hails for custom glyphs that lack an operator hail."""
    hails = list(st.hails or [])
    created = companion_hails_for_orphan_glyphs(hails, custom_glyphs_from_settings(st), glyph_allowlist=glyph_allowlist)
    if not created:
        return []
    st.hails = hails + created
    st.hails_catalog_materialized = True
    return created

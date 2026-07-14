"""Axiom-owned Hails render contract — loader, validation, and consumer helpers.

Canonical artifact: ``config/hails/hail-render-contract.v001.json``
Accepted source: control-alt-lcard PR #157 preview v001 behavior.

LCARD and other Control Alt apps consume this module/contract; they do not
define the Hail visual model, Paint Box, named effects, or lifecycle canon.
"""

from __future__ import annotations

import copy
import json
from functools import lru_cache
from pathlib import Path
from hails.hails_glyph_render import GOOGLE_TV_RENDER_TARGET, resolve_glyph_render
from hails.hail_glyph_tv_projection import CONSUMER_AXIOM_AUTHORING, CONSUMER_GOOGLE_TV_APK

CONTRACT_VERSION = "v001-integration"
CONTRACT_REL_PATH = Path("config") / "hails" / "hail-render-contract.v001.json"
CONTRACT_V002_BETA_VERSION = "v002-beta"
CONTRACT_V002_BETA_REL_PATH = Path("config") / "hails" / "hail-render-contract.v002-beta.json"

KNOWN_NAMED_EFFECT_IDS: tuple[str, ...] = ("none", "pop", "burst", "transporter")  # legacy fallback
SELECTABLE_EFFECT_STATUSES: frozenset[str] = frozenset({"active"})
KNOWN_SIZE_TIERS: tuple[str, ...] = ("small", "medium", "large")
KNOWN_SIZE_CODES: tuple[str, ...] = ("S", "M", "L")

LEGACY_EFFECT_ALIASES: dict[str, str] = {
    "transporter_beam": "transporter",
}

SCALE_TO_SIZE_CODE: dict[str, str] = {
    "small": "S",
    "medium": "M",
    "large": "L",
    "S": "S",
    "M": "M",
    "L": "L",
}


def _repo_root() -> Path:
    module_dir = Path(__file__).resolve().parent
    # Package lives in backend/hails; walk up to find config/ (repo root in dev,
    # /app in Docker where backend is copied flat).
    for candidate in (module_dir, *module_dir.parents):
        if (candidate / "config" / "hails").is_dir():
            return candidate
    return module_dir.parents[1]


def contract_path() -> Path:
    return _repo_root() / CONTRACT_REL_PATH


def contract_v002_beta_path() -> Path:
    return _repo_root() / CONTRACT_V002_BETA_REL_PATH


@lru_cache(maxsize=1)
def load_hail_render_contract() -> dict[str, Any]:
    path = contract_path()
    with path.open(encoding="utf-8") as fh:
        return json.load(fh)


@lru_cache(maxsize=1)
def load_hail_render_contract_v002_beta() -> dict[str, Any]:
    path = contract_v002_beta_path()
    with path.open(encoding="utf-8") as fh:
        return json.load(fh)


def load_hail_render_contract_for_generation(generation: str | None = None) -> dict[str, Any]:
    raw = (generation or "").strip().lower()
    if raw in {"v002-beta", "v002", "beta", "v003-silhouette", "v003"}:
        return load_hail_render_contract_v002_beta()
    return load_hail_render_contract()


def reload_hail_render_contract() -> dict[str, Any]:
    load_hail_render_contract.cache_clear()
    load_hail_render_contract_v002_beta.cache_clear()
    return load_hail_render_contract()


def normalize_named_effect_id(effect_id: str | None) -> str:
    raw = (effect_id or "").strip()
    if not raw:
        return "transporter"
    return LEGACY_EFFECT_ALIASES.get(raw, raw)


def _preview_visual(contract: dict[str, Any]) -> dict[str, Any]:
    visual = contract.get("previewVisual")
    return visual if isinstance(visual, dict) else {}


def _legacy_named_effects(contract: dict[str, Any]) -> dict[str, Any]:
    named = _preview_visual(contract).get("namedEffects", {})
    return named if isinstance(named, dict) else {}


def _raw_effect_registry_entries(contract: dict[str, Any]) -> dict[str, Any]:
    registry = _preview_visual(contract).get("effectRegistry", {})
    entries = registry.get("entries") if isinstance(registry, dict) else None
    return entries if isinstance(entries, dict) else {}


def _resolve_registry_identity(entry: dict[str, Any], contract: dict[str, Any]) -> dict[str, Any]:
    identity_ref = (entry.get("identityRef") or "").strip()
    if identity_ref:
        legacy = (_legacy_named_effects(contract).get("effects") or {}).get(identity_ref)
        if isinstance(legacy, dict):
            return copy.deepcopy(legacy)
    identity = entry.get("identity")
    return copy.deepcopy(identity) if isinstance(identity, dict) else {}


def effect_registry_entries(contract: dict[str, Any] | None = None) -> dict[str, dict[str, Any]]:
    """Resolved registry entries keyed by effect id (identity merged from namedEffects when identityRef set)."""
    doc = contract or load_hail_render_contract()
    raw = _raw_effect_registry_entries(doc)
    if not raw:
        legacy_effects = (_legacy_named_effects(doc).get("effects") or {})
        return {
            effect_id: {
                "id": effect_id,
                "label": (entry.get("label") if isinstance(entry, dict) else effect_id),
                "status": "active",
                "identity": copy.deepcopy(entry) if isinstance(entry, dict) else {},
                "tuning": {"variables": [], "defaults": {}},
                "capabilities": {},
            }
            for effect_id, entry in legacy_effects.items()
            if isinstance(entry, dict)
        }

    resolved: dict[str, dict[str, Any]] = {}
    for effect_id, entry in raw.items():
        if not isinstance(entry, dict):
            continue
        normalized_id = normalize_named_effect_id(str(effect_id))
        resolved[normalized_id] = {
            **copy.deepcopy(entry),
            "id": normalized_id,
            "identity": _resolve_registry_identity(entry, doc),
        }
    return resolved


def effect_registry_entry(contract: dict[str, Any], effect_id: str) -> dict[str, Any] | None:
    normalized = normalize_named_effect_id(effect_id)
    return effect_registry_entries(contract).get(normalized)


def _raw_family_registry_entry(contract: dict[str, Any], effect_id: str) -> dict[str, Any] | None:
    normalized = normalize_named_effect_id(effect_id)
    entry = _raw_effect_registry_entries(contract).get(normalized)
    return entry if isinstance(entry, dict) else None


def family_variation_entries(entry: dict[str, Any]) -> dict[str, dict[str, Any]]:
    variations = entry.get("variations")
    if not isinstance(variations, dict):
        return {}
    return {str(variation_id): variation for variation_id, variation in variations.items() if isinstance(variation, dict)}


def family_has_variations(contract: dict[str, Any], effect_id: str) -> bool:
    entry = _raw_family_registry_entry(contract, effect_id)
    return bool(entry and family_variation_entries(entry))


def default_variation_id_for_effect(contract: dict[str, Any], effect_id: str) -> str | None:
    entry = _raw_family_registry_entry(contract, effect_id)
    if entry is None:
        return None
    variations = family_variation_entries(entry)
    if not variations:
        return None
    explicit = (entry.get("defaultVariationId") or "").strip()
    if explicit and explicit in variations:
        return explicit
    for variation_id, variation in variations.items():
        if variation.get("default") is True and (variation.get("status") or "active") in SELECTABLE_EFFECT_STATUSES:
            return variation_id
    for variation_id, variation in variations.items():
        if (variation.get("status") or "active") in SELECTABLE_EFFECT_STATUSES:
            return variation_id
    return None


def normalize_effect_variation_id(
    effect_id: str,
    variation_id: str | None,
    contract: dict[str, Any] | None = None,
) -> str | None:
    doc = contract or load_hail_render_contract()
    normalized = normalize_named_effect_id(effect_id)
    variations = family_variation_entries(_raw_family_registry_entry(doc, normalized) or {})
    if not variations:
        return None
    raw = (variation_id or "").strip()
    if raw:
        variation = variations.get(raw)
        if variation is None:
            return None
        if (variation.get("status") or "active") not in SELECTABLE_EFFECT_STATUSES:
            return None
        return raw
    return default_variation_id_for_effect(doc, normalized)


def validate_effect_variation_id(
    effect_id: str,
    variation_id: Any,
    contract: dict[str, Any] | None = None,
) -> list[dict[str, str]]:
    doc = contract or load_hail_render_contract()
    normalized = normalize_named_effect_id(effect_id)
    if not family_has_variations(doc, normalized):
        if variation_id is None or (isinstance(variation_id, str) and not variation_id.strip()):
            return []
        return [{"path": "/visual/effect_variation_id", "message": f"effect {normalized} does not support variations"}]
    if variation_id is None or (isinstance(variation_id, str) and not variation_id.strip()):
        return []
    if not isinstance(variation_id, str):
        return [{"path": "/visual/effect_variation_id", "message": "effect_variation_id must be a string"}]
    if normalize_effect_variation_id(normalized, variation_id, doc) is None:
        return [
            {
                "path": "/visual/effect_variation_id",
                "message": f"unknown or inactive effect_variation_id for {normalized}",
            }
        ]
    return []


def effect_variation_entry(
    contract: dict[str, Any],
    effect_id: str,
    variation_id: str,
) -> dict[str, Any] | None:
    entry = _raw_family_registry_entry(contract, effect_id)
    if entry is None:
        return None
    variation = family_variation_entries(entry).get((variation_id or "").strip())
    return copy.deepcopy(variation) if isinstance(variation, dict) else None


def _merge_choreography_anchors(base: Any, override: Any) -> dict[str, Any]:
    merged = copy.deepcopy(base) if isinstance(base, dict) else {}
    if isinstance(override, dict):
        merged.update(copy.deepcopy(override))
    return merged


def named_effect_identity(
    contract: dict[str, Any],
    effect_id: str,
    variation_id: str | None = None,
) -> dict[str, Any]:
    base = copy.deepcopy(named_effect_entry(contract, effect_id) or {})
    if not variation_id:
        return base
    variation = effect_variation_entry(contract, effect_id, variation_id)
    if variation is None:
        return base
    var_identity = variation.get("identity")
    if not isinstance(var_identity, dict):
        return base
    for key, value in var_identity.items():
        if key == "choreographyAnchors" and isinstance(value, dict):
            base["choreographyAnchors"] = _merge_choreography_anchors(base.get("choreographyAnchors"), value)
        else:
            base[key] = copy.deepcopy(value)
    return base


def resolve_registry_tuning_entry(
    contract: dict[str, Any],
    effect_id: str,
    variation_id: str | None = None,
) -> dict[str, Any] | None:
    entry = effect_registry_entry(contract, effect_id)
    if entry is None:
        return None
    if not variation_id:
        return entry
    variation = effect_variation_entry(contract, effect_id, variation_id)
    if variation is None:
        return entry
    merged = copy.deepcopy(entry)
    var_tuning = variation.get("tuning")
    if isinstance(var_tuning, dict) and (var_tuning.get("variables") or var_tuning.get("defaults")):
        family_tuning = merged.get("tuning") if isinstance(merged.get("tuning"), dict) else {}
        merged["tuning"] = {
            "variables": list(var_tuning.get("variables") or family_tuning.get("variables") or []),
            "defaults": {**(family_tuning.get("defaults") or {}), **(var_tuning.get("defaults") or {})},
        }
    return merged


def effect_variation_for_api(
    contract: dict[str, Any],
    effect_id: str,
    variation_id: str,
) -> dict[str, Any] | None:
    variation = effect_variation_entry(contract, effect_id, variation_id)
    if variation is None:
        return None
    tuning_entry = resolve_registry_tuning_entry(contract, effect_id, variation_id) or {}
    variables = []
    for var in effect_tuning_schema(tuning_entry):
        public = {k: v for k, v in var.items() if k != "mapsTo"}
        variables.append(public)
    preview = variation.get("preview") if isinstance(variation.get("preview"), dict) else {}
    merged_identity = named_effect_identity(contract, effect_id, variation_id)
    preview_identity = {
        key: copy.deepcopy(merged_identity[key])
        for key in _PREVIEW_IDENTITY_KEYS
        if key in merged_identity
    }
    return {
        "id": variation_id,
        "label": variation.get("label") or variation_id,
        "status": variation.get("status") or "active",
        "default": variation.get("default") is True,
        "reference": variation.get("reference"),
        "recommended_palette_id": variation.get("recommended_palette_id"),
        "preview": copy.deepcopy(preview),
        "preview_identity": preview_identity,
        "tuning_variables": variables,
        "tuning_defaults": _tuning_defaults(tuning_entry),
    }


def active_effect_ids(contract: dict[str, Any] | None = None) -> tuple[str, ...]:
    entries = effect_registry_entries(contract)
    if not entries:
        return KNOWN_NAMED_EFFECT_IDS
    doc = contract or load_hail_render_contract()
    allowlist_order = list(_legacy_named_effects(doc).get("allowlist") or [])
    active_set = {
        effect_id
        for effect_id, entry in entries.items()
        if (entry.get("status") or "active") in SELECTABLE_EFFECT_STATUSES
    }
    ordered = [effect_id for effect_id in allowlist_order if effect_id in active_set]
    for effect_id in sorted(active_set):
        if effect_id not in ordered:
            ordered.append(effect_id)
    return tuple(ordered) if ordered else KNOWN_NAMED_EFFECT_IDS


def effect_tuning_schema(entry: dict[str, Any]) -> list[dict[str, Any]]:
    tuning = entry.get("tuning") if isinstance(entry.get("tuning"), dict) else {}
    variables = tuning.get("variables")
    if not isinstance(variables, list):
        return []
    return [row for row in variables if isinstance(row, dict) and (row.get("key") or "").strip()]


def _tuning_defaults(entry: dict[str, Any]) -> dict[str, Any]:
    tuning = entry.get("tuning") if isinstance(entry.get("tuning"), dict) else {}
    defaults = tuning.get("defaults")
    return copy.deepcopy(defaults) if isinstance(defaults, dict) else {}


_PREVIEW_IDENTITY_KEYS = (
    "glyphResolveStyle",
    "fieldStyle",
    "particleStyle",
    "messageRevealStyle",
    "choreographyAnchors",
    "lifecycleTiming",
    "stableResidual",
)


def _preview_identity_for_api(entry: dict[str, Any]) -> dict[str, Any]:
    identity = entry.get("identity")
    if not isinstance(identity, dict):
        return {}
    return {key: copy.deepcopy(identity[key]) for key in _PREVIEW_IDENTITY_KEYS if key in identity}


def _coerce_tuning_value(variable: dict[str, Any], raw: Any) -> Any | None:
    var_type = (variable.get("type") or "range").strip()
    key = (variable.get("key") or "").strip()
    if var_type == "enum":
        options = variable.get("options")
        if not isinstance(options, list):
            return None
        value = str(raw).strip() if raw is not None else ""
        return value if value in options else None
    try:
        value = float(raw)
    except (TypeError, ValueError):
        return None
    minimum = float(variable.get("min", value))
    maximum = float(variable.get("max", value))
    if value < minimum or value > maximum:
        return None
    step = variable.get("step")
    if step is not None:
        try:
            step_f = float(step)
            if step_f > 0:
                value = round(value / step_f) * step_f
        except (TypeError, ValueError):
            pass
    if float(value).is_integer() and abs(value - int(value)) < 1e-9:
        return int(value)
    return value


def validate_effect_tuning(
    effect_id: str,
    tuning: Any,
    contract: dict[str, Any] | None = None,
    *,
    variation_id: str | None = None,
) -> list[dict[str, str]]:
    doc = contract or load_hail_render_contract()
    normalized = normalize_named_effect_id(effect_id)
    entry = resolve_registry_tuning_entry(doc, normalized, variation_id)
    if entry is None:
        return [{"path": "/visual/effect_id", "message": f"unknown effect_id: {normalized}"}]
    if tuning is None:
        return []
    if not isinstance(tuning, dict):
        return [{"path": "/visual/effect_tuning", "message": "effect_tuning must be an object"}]

    errors: list[dict[str, str]] = []
    schema = {var["key"]: var for var in effect_tuning_schema(entry)}
    for key, raw in tuning.items():
        variable = schema.get(str(key))
        if variable is None:
            errors.append({"path": f"/visual/effect_tuning/{key}", "message": "unknown tuning key for effect"})
            continue
        if _coerce_tuning_value(variable, raw) is None:
            errors.append({"path": f"/visual/effect_tuning/{key}", "message": "value out of range or invalid type"})
    return errors


def normalize_effect_tuning(
    effect_id: str,
    tuning: Any,
    contract: dict[str, Any] | None = None,
    *,
    variation_id: str | None = None,
) -> dict[str, Any]:
    doc = contract or load_hail_render_contract()
    normalized = normalize_named_effect_id(effect_id)
    entry = resolve_registry_tuning_entry(doc, normalized, variation_id)
    if entry is None:
        return {}
    defaults = _tuning_defaults(entry)
    if not isinstance(tuning, dict):
        return defaults

    schema = {var["key"]: var for var in effect_tuning_schema(entry)}
    out = copy.deepcopy(defaults)
    for key, raw in tuning.items():
        variable = schema.get(str(key))
        if variable is None:
            continue
        coerced = _coerce_tuning_value(variable, raw)
        if coerced is not None:
            out[str(key)] = coerced
    return out


def effect_registry_for_api(contract: dict[str, Any] | None = None) -> dict[str, Any]:
    doc = contract or load_hail_render_contract()
    registry_meta = _preview_visual(doc).get("effectRegistry", {})
    entries_out: list[dict[str, Any]] = []
    for effect_id, entry in effect_registry_entries(doc).items():
        tuning = entry.get("tuning") if isinstance(entry.get("tuning"), dict) else {}
        variables = []
        for var in effect_tuning_schema(entry):
            public = {k: v for k, v in var.items() if k != "mapsTo"}
            variables.append(public)
        entries_out.append(
            {
                "id": effect_id,
                "label": entry.get("label") or effect_id,
                "status": entry.get("status") or "active",
                "default": entry.get("default") is True,
                "default_variation_id": default_variation_id_for_effect(doc, effect_id),
                "variations": [
                    effect_variation_for_api(doc, effect_id, variation_id)
                    for variation_id in sorted(family_variation_entries(_raw_family_registry_entry(doc, effect_id) or {}))
                    if effect_variation_for_api(doc, effect_id, variation_id) is not None
                ],
                "capabilities": entry.get("capabilities") if isinstance(entry.get("capabilities"), dict) else {},
                "quality": entry.get("quality") if isinstance(entry.get("quality"), dict) else {},
                "templates": list(entry.get("templates") or []),
                "tuning_variables": variables,
                "tuning_defaults": _tuning_defaults(entry),
                "preview_identity": _preview_identity_for_api(entry),
            }
        )
    return {
        "default_effect_id": (
            registry_meta.get("defaultEffectId")
            if isinstance(registry_meta, dict)
            else None
        )
        or _legacy_named_effects(doc).get("defaultEffectId", "transporter"),
        "active_effect_ids": list(active_effect_ids(doc)),
        "entries": entries_out,
    }


def is_valid_named_effect_id(effect_id: str | None, contract: dict[str, Any] | None = None) -> bool:
    normalized = normalize_named_effect_id(effect_id)
    entry = effect_registry_entry(contract or load_hail_render_contract(), normalized)
    if entry is not None:
        return (entry.get("status") or "active") in SELECTABLE_EFFECT_STATUSES
    return normalized in KNOWN_NAMED_EFFECT_IDS


def named_effect_entry(contract: dict[str, Any], effect_id: str) -> dict[str, Any] | None:
    normalized = normalize_named_effect_id(effect_id)
    entry = effect_registry_entry(contract, normalized)
    if entry is not None:
        identity = entry.get("identity")
        if isinstance(identity, dict) and identity:
            return identity
    named = _legacy_named_effects(contract)
    effects = named.get("effects") or {}
    return effects.get(normalized)


def resolve_effect_lifecycle_timing(
    effect_id: str,
    stable_hold_ms: int | None,
    contract: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Separate entrance / stable hold / exit timing for a named effect."""
    doc = contract or load_hail_render_contract()
    normalized = normalize_named_effect_id(effect_id)
    entry = named_effect_entry(doc, normalized) or {}
    lifecycle = entry.get("lifecycleTiming") or {}
    entrance = int(lifecycle.get("entrance_animation_ms") or 0)
    exit_ms = int(lifecycle.get("exit_animation_ms") or 0)
    beam_in_seed_ms = lifecycle.get("beam_in_seed_ms")
    beam_out_seed_ms = lifecycle.get("beam_out_seed_ms")
    hold = stable_hold_ms
    total = None if hold is None else entrance + hold + exit_ms
    result: dict[str, Any] = {
        "effect_id": normalized,
        "entrance_animation_ms": entrance,
        "stable_hold_ms": hold,
        "exit_animation_ms": exit_ms,
        "total_timed_lifecycle_ms": total,
        "note": "stable_hold_ms is additive — not crammed into duration preset",
    }
    if beam_in_seed_ms is not None:
        result["beam_in_seed_ms"] = int(beam_in_seed_ms)
    if beam_out_seed_ms is not None:
        result["beam_out_seed_ms"] = int(beam_out_seed_ms)
    return result


def normalize_size_tier(scale: str | None) -> str:
    raw = (scale or "medium").strip().lower()
    if raw in KNOWN_SIZE_TIERS:
        return raw
    mapping = (
        load_hail_render_contract()
        .get("runtimeModel", {})
        .get("sizeTierMap", {"S": "small", "M": "medium", "L": "large"})
    )
    if raw.upper() in mapping:
        return mapping[raw.upper()]
    return "medium"


def resolve_size_code(scale: str | None) -> str:
    tier = normalize_size_tier(scale)
    return SCALE_TO_SIZE_CODE.get(tier, "M")


def capability_summary_for_effect(
    effect_id: str,
    contract: dict[str, Any] | None = None,
) -> dict[str, Any]:
    doc = contract or load_hail_render_contract()
    normalized = normalize_named_effect_id(effect_id)
    entry = effect_registry_entry(doc, normalized) or {}
    caps = entry.get("capabilities") if isinstance(entry.get("capabilities"), dict) else {}
    android_keys = caps.get("android_tuning_keys")
    return {
        "effect_id": normalized,
        "status": entry.get("status") or "active",
        "axiom_preview": caps.get("axiom_preview", "none"),
        "lcard_preview": caps.get("lcard_preview", "none"),
        "android": caps.get("android", "none"),
        "android_note": caps.get("android_note"),
        "android_tuning_keys": list(android_keys) if isinstance(android_keys, list) else [],
    }


def project_effect_tuning_to_workbench(
    effect_id: str,
    tuning: Any,
    contract: dict[str, Any] | None = None,
    *,
    variation_id: str | None = None,
) -> dict[str, Any]:
    """Map operator effect_tuning keys to workbench projection keys via registry mapsTo."""
    doc = contract or load_hail_render_contract()
    normalized_id = normalize_named_effect_id(effect_id)
    entry = resolve_registry_tuning_entry(doc, normalized_id, variation_id)
    if entry is None:
        return {}
    normalized = normalize_effect_tuning(normalized_id, tuning, doc, variation_id=variation_id)
    projection: dict[str, Any] = {}
    for var in effect_tuning_schema(entry):
        key = (var.get("key") or "").strip()
        if not key or key not in normalized:
            continue
        maps_to = var.get("mapsTo")
        if isinstance(maps_to, dict):
            workbench_key = (maps_to.get("workbench") or "").strip()
            if workbench_key:
                projection[workbench_key] = normalized[key]
    return projection


def android_effect_tuning_subset(
    effect_id: str,
    tuning: Any,
    contract: dict[str, Any] | None = None,
    *,
    variation_id: str | None = None,
) -> dict[str, Any]:
    """Return operator tuning keys the Android transporter path can consume."""
    doc = contract or load_hail_render_contract()
    normalized_id = normalize_named_effect_id(effect_id)
    summary = capability_summary_for_effect(normalized_id, doc)
    allowed = set(summary.get("android_tuning_keys") or [])
    if not allowed:
        return {}
    normalized = normalize_effect_tuning(normalized_id, tuning, doc, variation_id=variation_id)
    return {key: normalized[key] for key in allowed if key in normalized}


def build_consumer_render_payload(
    hail_record: dict[str, Any],
    contract: dict[str, Any] | None = None,
    *,
    custom_glyphs: dict[str, dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """LCARD consumer projection: hail record + Axiom render contract semantics."""
    doc = contract or load_hail_render_contract_for_generation("v002-beta")
    visual = hail_record.get("visual") if isinstance(hail_record.get("visual"), dict) else {}
    icon = hail_record.get("icon") if isinstance(hail_record.get("icon"), dict) else {}
    message = hail_record.get("message") if isinstance(hail_record.get("message"), dict) else {}

    effect_id = normalize_named_effect_id(visual.get("effect_id"))
    variation_id = normalize_effect_variation_id(effect_id, visual.get("effect_variation_id"), doc)
    size_tier = normalize_size_tier(visual.get("scale") or visual.get("size_tier"))
    stable_hold_ms = visual.get("duration_ms")
    if stable_hold_ms is not None:
        stable_hold_ms = int(stable_hold_ms)

    lifecycle = resolve_effect_lifecycle_timing(effect_id, stable_hold_ms, doc)
    effect_entry = named_effect_identity(doc, effect_id, variation_id)
    effect_tuning = normalize_effect_tuning(effect_id, visual.get("effect_tuning"), doc, variation_id=variation_id)
    capability_summary = capability_summary_for_effect(effect_id, doc)
    tuning_projection = project_effect_tuning_to_workbench(
        effect_id, effect_tuning, doc, variation_id=variation_id
    )
    android_tuning = android_effect_tuning_subset(effect_id, effect_tuning, doc, variation_id=variation_id)
    variation_meta = effect_variation_for_api(doc, effect_id, variation_id) if variation_id else None
    glyph_id_value = icon.get("value") or "default"
    glyph_render = resolve_glyph_render(
        glyph_id_value,
        custom_glyphs=custom_glyphs,
        consumer_id=CONSUMER_GOOGLE_TV_APK,
    )
    glyph_render_canonical = resolve_glyph_render(
        glyph_id_value,
        custom_glyphs=custom_glyphs,
        consumer_id=CONSUMER_AXIOM_AUTHORING,
    )

    payload = {
        "hail_id": hail_record.get("id"),
        "render_target": dict(GOOGLE_TV_RENDER_TARGET),
        "effect_id": effect_id,
        "effect_variation_id": variation_id,
        "effect_tuning": effect_tuning,
        "effect_tuning_projection": tuning_projection,
        "android_effect_tuning": android_tuning,
        "capability_summary": capability_summary,
        "effect_variation": (
            {
                "id": variation_meta.get("id"),
                "label": variation_meta.get("label"),
                "recommended_palette_id": variation_meta.get("recommended_palette_id"),
                "preview": variation_meta.get("preview"),
            }
            if variation_meta
            else None
        ),
        "glyph_id": glyph_id_value,
        "glyph_render": glyph_render,
        "glyph_render_canonical": (
            glyph_render_canonical
            if glyph_render_canonical != glyph_render
            else None
        ),
        "palette_id": visual.get("palette_id") or "axiom_dark_cyan",
        "message": message.get("short_text") or "",
        "duration_ms": stable_hold_ms,
        "placement_id": visual.get("placement_id"),
        "placement_mode": visual.get("placement_mode") or "preset",
        "x_percent": visual.get("x_percent"),
        "y_percent": visual.get("y_percent"),
        "size_tier": size_tier,
        "size_code": resolve_size_code(size_tier),
        "lifecycle_timing": lifecycle,
        "effect_identity": {
            "glyph_resolve_style": effect_entry.get("glyphResolveStyle"),
            "field_style": effect_entry.get("fieldStyle"),
            "particle_style": effect_entry.get("particleStyle"),
            "choreography_anchors": {
                key: value
                for key, value in (effect_entry.get("choreographyAnchors") or {}).items()
                if key not in ("messageReveal", "messageRevealStart")
            },
        },
        "contract_version": doc.get("version", CONTRACT_VERSION),
        "ownership": doc.get("ownership", {}).get("hails", "axiom"),
        "note": "Axiom-owned render payload — LCARD consumes; does not define Hails",
    }
    from hails.hail_package_v2 import enrich_consumer_render_payload_v2

    return enrich_consumer_render_payload_v2(
        payload,
        hail_record,
        contract=doc,
        custom_glyphs=custom_glyphs,
    )


def render_contract_summary(contract: dict[str, Any] | None = None) -> dict[str, Any]:
    from hails.hails_message_sidekick import message_registry_for_api

    doc = contract or load_hail_render_contract()
    named = _legacy_named_effects(doc)
    registry = effect_registry_for_api(doc)
    message_registry = message_registry_for_api(doc)
    return {
        "version": doc.get("version", CONTRACT_VERSION),
        "ownership": doc.get("ownership"),
        "canonicalLocation": doc.get("canonicalLocation"),
        "lifecycleModel": doc.get("lifecycleModel"),
        "named_effect_allowlist": list(active_effect_ids(doc)),
        "default_named_effect": registry.get("default_effect_id") or named.get("defaultEffectId", "transporter"),
        "effect_registry_entry_count": len(registry.get("entries") or []),
        "message_registry_entry_count": len(message_registry.get("entries") or []),
        "default_message_sidekick_id": message_registry.get("default_sidekick_id"),
        "size_codes": doc.get("runtimeModel", {}).get("sizeCodes", list(KNOWN_SIZE_CODES)),
        "layout_hierarchy": (
            "Paint Box -> Safe Effect Zone -> Glyph Focus Region -> "
            "Effect Envelope -> Glyph Resolve -> Message Support"
        ),
        "pop_tuning_note": (
            "Pop is acceptable for v001 integration; future overshoot/ring tuning "
            "via Axiom-owned controls/config — not a blocker"
        ),
    }


def validate_contract_integrity(contract: dict[str, Any] | None = None) -> list[str]:
    """Return list of validation errors; empty means OK."""
    doc = contract or load_hail_render_contract()
    errors: list[str] = []

    if doc.get("ownership", {}).get("hails") != "axiom":
        errors.append("ownership.hails must be axiom")

    named = _legacy_named_effects(doc)
    allowlist = named.get("allowlist") or []
    for effect_id in active_effect_ids(doc):
        if effect_id not in allowlist:
            errors.append(f"namedEffects.allowlist missing {effect_id}")
        entry = named_effect_entry(doc, effect_id)
        if not entry:
            errors.append(f"effect registry / namedEffects identity missing for {effect_id}")
            continue
        lt = entry.get("lifecycleTiming") or {}
        if "entrance_animation_ms" not in lt or "exit_animation_ms" not in lt:
            errors.append(f"{effect_id} lifecycleTiming entrance/exit required")

    raw_registry = _raw_effect_registry_entries(doc)
    for effect_id, entry in raw_registry.items():
        if not isinstance(entry, dict):
            errors.append(f"effectRegistry.entries.{effect_id} must be an object")
            continue
        status = (entry.get("status") or "active").strip()
        if status not in {"active", "planned", "deprecated", "preview_only"}:
            errors.append(f"effectRegistry.entries.{effect_id}.status invalid: {status}")
        tuning = entry.get("tuning")
        if not isinstance(tuning, dict):
            errors.append(f"effectRegistry.entries.{effect_id}.tuning required")
            continue
        defaults = tuning.get("defaults")
        variables = tuning.get("variables")
        if not isinstance(defaults, dict):
            errors.append(f"effectRegistry.entries.{effect_id}.tuning.defaults required")
        if not isinstance(variables, list):
            errors.append(f"effectRegistry.entries.{effect_id}.tuning.variables required")
        elif isinstance(defaults, dict):
            for var in variables:
                if not isinstance(var, dict):
                    continue
                key = (var.get("key") or "").strip()
                if key and key not in defaults:
                    errors.append(f"effectRegistry.entries.{effect_id}.tuning.defaults missing {key}")

    transporter = (named.get("effects") or {}).get("transporter", {}).get("lifecycleTiming", {})
    pop = (named.get("effects") or {}).get("pop", {}).get("lifecycleTiming", {})
    burst = (named.get("effects") or {}).get("burst", {}).get("lifecycleTiming", {})
    if transporter and pop and burst:
        if not (
            transporter.get("entrance_animation_ms", 0)
            > burst.get("entrance_animation_ms", 0)
            > pop.get("entrance_animation_ms", 0)
        ):
            errors.append("entrance_animation_ms should increase pop < burst < transporter")

    paint_box = doc.get("previewVisual", {}).get("paintBox", {})
    tiers = paint_box.get("tiers") or {}
    size_map = doc.get("runtimeModel", {}).get("sizeTierMap") or {}
    for tier_id in KNOWN_SIZE_TIERS:
        if tier_id not in tiers:
            errors.append(f"paintBox.tiers missing {tier_id}")
    for code, tier_id in size_map.items():
        tier_entry = tiers.get(tier_id) or {}
        if tier_entry.get("sizeCode") != code:
            errors.append(f"paintBox.tiers.{tier_id}.sizeCode must match runtimeModel.sizeTierMap.{code}")

    payload_fields = doc.get("payloadFields") or []
    for required in ("size_tier", "size_code", "effect_variation_id"):
        if required not in payload_fields:
            errors.append(f"payloadFields missing {required}")

    transporter_raw = _raw_family_registry_entry(doc, "transporter")
    if transporter_raw:
        variations = family_variation_entries(transporter_raw)
        if not variations:
            errors.append("transporter must declare variations")
        elif default_variation_id_for_effect(doc, "transporter") not in variations:
            errors.append("transporter defaultVariationId must reference an active variation")
        for variation_id, variation in variations.items():
            if not (variation.get("label") or "").strip():
                errors.append(f"transporter.variations.{variation_id}.label required")
            if not isinstance(variation.get("preview"), dict):
                errors.append(f"transporter.variations.{variation_id}.preview required")

    for family_id in ("pop", "burst"):
        family_raw = _raw_family_registry_entry(doc, family_id)
        if family_raw:
            variations = family_variation_entries(family_raw)
            if not variations:
                errors.append(f"{family_id} must declare variations")
            elif default_variation_id_for_effect(doc, family_id) not in variations:
                errors.append(f"{family_id} defaultVariationId must reference an active variation")
            for variation_id, variation in variations.items():
                if not (variation.get("label") or "").strip():
                    errors.append(f"{family_id}.variations.{variation_id}.label required")
                if not isinstance(variation.get("preview"), dict):
                    errors.append(f"{family_id}.variations.{variation_id}.preview required")

    return errors

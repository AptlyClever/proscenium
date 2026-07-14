"""Settings-backed Effect preset library for Hail Forge.

Gallery presets ship in ``config/hails/hail-effects-gallery.v001.json``.
Operators may override built-in presets in settings or create custom presets.
"""

from __future__ import annotations

import copy
import re
import unicodedata
from datetime import datetime, timezone
from typing import Any

from hails.hail_effects_gallery import gallery_presets, validate_hail_effects_gallery
from hails.hails_composer import ComposerValidationError, TRANSITION_STYLES

CUSTOM_EFFECT_PRESET_PREFIX = "custom-effect-"
_PRESET_ID_RE = re.compile(r"^custom-effect-[a-z0-9][a-z0-9-]*$")

_OVERRIDABLE_KEYS = (
    "label",
    "description",
    "mood",
    "reduced_motion",
    "animation_enabled",
    "transition_style",
    "effect_id",
    "effect_tuning",
    "visual",
)


def _now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def _trimmed(value: Any) -> str:
    return str(value or "").strip()


def gallery_preset_id_set() -> set[str]:
    return {(p.get("id") or "").strip() for p in gallery_presets() if (p.get("id") or "").strip()}


def custom_effect_presets_from_settings(st: Any) -> dict[str, dict[str, Any]]:
    raw = getattr(st, "custom_effect_presets", None)
    if not isinstance(raw, dict):
        return {}
    out: dict[str, dict[str, Any]] = {}
    for key, value in raw.items():
        preset_id = _trimmed(key)
        if preset_id and isinstance(value, dict):
            out[preset_id] = copy.deepcopy(value)
    return out


def effect_preset_overrides_from_settings(st: Any) -> dict[str, dict[str, Any]]:
    raw = getattr(st, "effect_preset_overrides", None)
    if not isinstance(raw, dict):
        return {}
    out: dict[str, dict[str, Any]] = {}
    for key, value in raw.items():
        preset_id = _trimmed(key)
        if preset_id and isinstance(value, dict):
            out[preset_id] = copy.deepcopy(value)
    return out


def slugify_custom_effect_preset_id(name: str, existing: set[str]) -> str:
    base = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode()
    base = re.sub(r"[^a-z0-9]+", "-", base.lower()).strip("-") or "effect"
    candidate = f"{CUSTOM_EFFECT_PRESET_PREFIX}{base}"
    if candidate not in existing and _PRESET_ID_RE.match(candidate):
        return candidate
    for n in range(2, 1000):
        numbered = f"{CUSTOM_EFFECT_PRESET_PREFIX}{base}-{n}"
        if numbered not in existing and _PRESET_ID_RE.match(numbered):
            return numbered
    raise ComposerValidationError([{"path": "/id", "message": "could not allocate custom effect preset id"}])


def validate_effect_preset_record(preset: dict[str, Any]) -> list[dict[str, str]]:
    return validate_hail_effects_gallery(
        {
            "schema_version": 1,
            "gallery_id": "validate-single-preset",
            "presets": [preset],
        }
    )


def normalize_effect_preset_record(preset: dict[str, Any], *, preset_id: str | None = None) -> dict[str, Any]:
    pid = _trimmed(preset_id or preset.get("id"))
    visual = preset.get("visual") if isinstance(preset.get("visual"), dict) else {}
    effect_id = _trimmed(visual.get("effect_id") or preset.get("effect_id"))
    effect_tuning = preset.get("effect_tuning")
    normalized: dict[str, Any] = {
        "id": pid,
        "label": _trimmed(preset.get("label")) or pid,
        "description": _trimmed(preset.get("description")),
        "visual": {
            "effect_id": effect_id,
            "palette_id": _trimmed(visual.get("palette_id")),
            "scale": _trimmed(visual.get("scale")),
            "duration_ms": int(visual.get("duration_ms") or 5000),
            "placement_id": _trimmed(visual.get("placement_id")) or "upper_center",
        },
    }
    if preset.get("mood"):
        normalized["mood"] = _trimmed(preset.get("mood"))
    if preset.get("reduced_motion") is True:
        normalized["reduced_motion"] = True
    if preset.get("animation_enabled") is False:
        normalized["animation_enabled"] = False
    transition = _trimmed(preset.get("transition_style"))
    if transition in TRANSITION_STYLES:
        normalized["transition_style"] = transition
    if effect_id:
        normalized["effect_id"] = effect_id
    if isinstance(effect_tuning, dict) and effect_tuning:
        normalized["effect_tuning"] = copy.deepcopy(effect_tuning)
    if preset.get("created_at"):
        normalized["created_at"] = _trimmed(preset.get("created_at"))
    if preset.get("updated_at"):
        normalized["updated_at"] = _trimmed(preset.get("updated_at"))
    return normalized


def merge_preset_layers(base: dict[str, Any], patch: dict[str, Any]) -> dict[str, Any]:
    merged = copy.deepcopy(base)
    for key in _OVERRIDABLE_KEYS:
        if key not in patch:
            continue
        value = patch[key]
        if key == "visual" and isinstance(value, dict):
            visual = merged.get("visual") if isinstance(merged.get("visual"), dict) else {}
            merged["visual"] = {**visual, **copy.deepcopy(value)}
            continue
        if key == "effect_tuning" and isinstance(value, dict):
            merged["effect_tuning"] = copy.deepcopy(value)
            continue
        merged[key] = copy.deepcopy(value)
    return merged


def merged_effect_presets(st: Any) -> list[dict[str, Any]]:
    gallery_by_id = {p["id"]: copy.deepcopy(p) for p in gallery_presets()}
    overrides = effect_preset_overrides_from_settings(st)
    custom = custom_effect_presets_from_settings(st)
    merged: list[dict[str, Any]] = []

    for preset_id in sorted(gallery_by_id):
        item = copy.deepcopy(gallery_by_id[preset_id])
        if preset_id in overrides:
            item = merge_preset_layers(item, overrides[preset_id])
        item = normalize_effect_preset_record(item, preset_id=preset_id)
        item["source"] = "gallery"
        item["overridden"] = preset_id in overrides
        merged.append(item)

    for preset_id in sorted(custom):
        item = normalize_effect_preset_record(custom[preset_id], preset_id=preset_id)
        item["source"] = "custom"
        item["overridden"] = False
        merged.append(item)

    return merged


def is_gallery_preset_id(preset_id: str) -> bool:
    return _trimmed(preset_id) in gallery_preset_id_set()


def is_custom_effect_preset_id(preset_id: str) -> bool:
    return _trimmed(preset_id).startswith(CUSTOM_EFFECT_PRESET_PREFIX)


def register_custom_effect_preset(st: Any, body: dict[str, Any]) -> dict[str, Any]:
    if not isinstance(body, dict):
        raise ComposerValidationError([{"path": "/", "message": "preset body must be an object"}])
    custom = custom_effect_presets_from_settings(st)
    gallery_ids = gallery_preset_id_set()
    existing = set(custom) | gallery_ids
    preset_id = _trimmed(body.get("id"))
    if not preset_id:
        label = _trimmed(body.get("label")) or "Custom Effect"
        preset_id = slugify_custom_effect_preset_id(label, existing)
    elif preset_id in gallery_ids:
        raise ComposerValidationError([{"path": "/id", "message": "id conflicts with built-in gallery preset"}])
    elif not is_custom_effect_preset_id(preset_id):
        raise ComposerValidationError([{"path": "/id", "message": "custom preset id must use custom-effect- prefix"}])

    normalized = normalize_effect_preset_record({**body, "id": preset_id}, preset_id=preset_id)
    errors = validate_effect_preset_record(normalized)
    if errors:
        raise ComposerValidationError(errors)

    now = _now_iso()
    normalized["created_at"] = custom.get(preset_id, {}).get("created_at") or now
    normalized["updated_at"] = now
    custom[preset_id] = normalized
    st.custom_effect_presets = custom
    out = copy.deepcopy(normalized)
    out["source"] = "custom"
    out["overridden"] = False
    return out


def save_effect_preset(st: Any, preset_id: str, body: dict[str, Any]) -> dict[str, Any]:
    needle = _trimmed(preset_id)
    if not needle:
        raise ComposerValidationError([{"path": "/id", "message": "id is required"}])

    if is_gallery_preset_id(needle):
        gallery = next(p for p in gallery_presets() if p["id"] == needle)
        candidate = merge_preset_layers(gallery, body)
        candidate["id"] = needle
        normalized = normalize_effect_preset_record(candidate, preset_id=needle)
        errors = validate_effect_preset_record(normalized)
        if errors:
            raise ComposerValidationError(errors)
        overrides = effect_preset_overrides_from_settings(st)
        overrides[needle] = {k: copy.deepcopy(normalized[k]) for k in _OVERRIDABLE_KEYS if k in normalized}
        st.effect_preset_overrides = overrides
        out = copy.deepcopy(normalized)
        out["source"] = "gallery"
        out["overridden"] = True
        return out

    if is_custom_effect_preset_id(needle):
        custom = custom_effect_presets_from_settings(st)
        if needle not in custom:
            raise KeyError(needle)
        merged = merge_preset_layers(custom[needle], body)
        merged["id"] = needle
        normalized = normalize_effect_preset_record(merged, preset_id=needle)
        errors = validate_effect_preset_record(normalized)
        if errors:
            raise ComposerValidationError(errors)
        normalized["created_at"] = custom[needle].get("created_at") or _now_iso()
        normalized["updated_at"] = _now_iso()
        custom[needle] = normalized
        st.custom_effect_presets = custom
        out = copy.deepcopy(normalized)
        out["source"] = "custom"
        out["overridden"] = False
        return out

    raise KeyError(needle)


def delete_custom_effect_preset(st: Any, preset_id: str) -> None:
    needle = _trimmed(preset_id)
    if not is_custom_effect_preset_id(needle):
        raise ComposerValidationError([{"path": "/id", "message": "only custom effect presets may be deleted"}])
    custom = custom_effect_presets_from_settings(st)
    if needle not in custom:
        raise KeyError(needle)
    del custom[needle]
    st.custom_effect_presets = custom


def reset_gallery_effect_preset(st: Any, preset_id: str) -> dict[str, Any]:
    needle = _trimmed(preset_id)
    if not is_gallery_preset_id(needle):
        raise ComposerValidationError([{"path": "/id", "message": "reset applies to built-in gallery presets only"}])
    overrides = effect_preset_overrides_from_settings(st)
    overrides.pop(needle, None)
    st.effect_preset_overrides = overrides
    gallery = next(p for p in gallery_presets() if p["id"] == needle)
    out = normalize_effect_preset_record(copy.deepcopy(gallery), preset_id=needle)
    out["source"] = "gallery"
    out["overridden"] = False
    return out

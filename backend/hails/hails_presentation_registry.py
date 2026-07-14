"""TV presentation registry — priority-driven scrim/plate presets (Phase B)."""

from __future__ import annotations

import copy
from typing import Any

from hails.hails_priority import normalize_priority_level

CONTRACT_PREVIEW_VISUAL_KEY = "previewVisual"
DEFAULT_PRESENTATION_PRESET_ID = "operational"


def _load_contract(contract: dict[str, Any] | None) -> dict[str, Any]:
    if contract is not None:
        return contract
    from hails.hails_render_contract import load_hail_render_contract_for_generation

    return load_hail_render_contract_for_generation("v002-beta")


def _preview_visual(contract: dict[str, Any]) -> dict[str, Any]:
    preview = contract.get(CONTRACT_PREVIEW_VISUAL_KEY)
    return preview if isinstance(preview, dict) else {}


def _registry_meta(contract: dict[str, Any]) -> dict[str, Any]:
    registry = _preview_visual(contract).get("presentationRegistry", {})
    return registry if isinstance(registry, dict) else {}


def presentation_registry_entries(contract: dict[str, Any] | None = None) -> dict[str, dict[str, Any]]:
    doc = _load_contract(contract)
    raw = _registry_meta(doc).get("entries", {})
    if not isinstance(raw, dict):
        return {}
    return {str(key): entry for key, entry in raw.items() if isinstance(entry, dict)}


def presentation_preset_entry(contract: dict[str, Any], preset_id: str) -> dict[str, Any] | None:
    return presentation_registry_entries(contract).get((preset_id or "").strip())


def default_preset_for_priority(priority_level: str, contract: dict[str, Any] | None = None) -> str:
    doc = _load_contract(contract)
    from hails.hails_alert_level_kit import kit_presentation_preset_id

    kit_preset = kit_presentation_preset_id(priority_level, doc)
    if kit_preset:
        return kit_preset
    meta = _registry_meta(doc)
    by_priority = meta.get("defaultPresetByPriority")
    normalized = normalize_priority_level(priority_level)
    if isinstance(by_priority, dict):
        mapped = by_priority.get(normalized)
        if isinstance(mapped, str) and mapped.strip():
            return mapped.strip()
    default_id = meta.get("defaultPresetId")
    if isinstance(default_id, str) and default_id.strip():
        return default_id.strip()
    return DEFAULT_PRESENTATION_PRESET_ID


def resolve_presentation_preset_id(
    hail_record: dict[str, Any],
    *,
    contract: dict[str, Any] | None = None,
) -> str:
    visual = hail_record.get("visual") if isinstance(hail_record.get("visual"), dict) else {}
    override = visual.get("presentation_preset_id")
    if isinstance(override, str) and override.strip():
        return override.strip()
    priority = normalize_priority_level(visual.get("priority_level"))
    return default_preset_for_priority(priority, contract)


def _clamp_float(value: Any, low: float, high: float, default: float) -> float:
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return default
    return max(low, min(high, parsed))


def preset_modifiers(entry: dict[str, Any] | None) -> dict[str, Any]:
    if not entry:
        return {}
    modifiers = entry.get("modifiers")
    return copy.deepcopy(modifiers) if isinstance(modifiers, dict) else {}


def build_presentation_entity(
    hail_record: dict[str, Any],
    *,
    contract: dict[str, Any] | None = None,
) -> dict[str, Any]:
    doc = _load_contract(contract)
    visual = hail_record.get("visual") if isinstance(hail_record.get("visual"), dict) else {}
    priority_level = normalize_priority_level(visual.get("priority_level"))
    preset_id = resolve_presentation_preset_id(hail_record, contract=doc)
    entry = presentation_preset_entry(doc, preset_id) or {}
    override = visual.get("presentation_preset_id")
    resolved_from_priority = not (isinstance(override, str) and override.strip())
    modifiers = preset_modifiers(entry)
    return {
        "preset_id": preset_id,
        "priority_level": priority_level,
        "label": str(entry.get("label") or preset_id),
        "resolved_from_priority": resolved_from_priority,
        "modifiers": modifiers,
    }


def apply_presentation_modifiers(
    presentation: dict[str, Any],
    modifiers: dict[str, Any],
) -> dict[str, Any]:
    """Merge preset modifiers onto palette-backed presentation block."""
    out = copy.deepcopy(presentation)
    if not modifiers:
        return out

    if "package_scrim_opacity" in modifiers:
        out["package_scrim_opacity"] = _clamp_float(
            modifiers["package_scrim_opacity"],
            0.08,
            0.45,
            float(out.get("package_scrim_opacity") or 0.2),
        )
    if "message_backing_opacity" in modifiers:
        out["message_backing_opacity"] = _clamp_float(
            modifiers["message_backing_opacity"],
            0.2,
            1.0,
            float(out.get("message_backing_opacity") or 0.5),
        )
    if "package_shadow_alpha" in modifiers:
        out["package_shadow_alpha"] = _clamp_float(
            modifiers["package_shadow_alpha"],
            0.1,
            0.55,
            float(out.get("package_shadow_alpha") or 0.28),
        )
    if "message_plate_radius_px" in modifiers:
        out["message_plate_radius_px"] = _clamp_float(
            modifiers["message_plate_radius_px"],
            4.0,
            16.0,
            float(out.get("message_plate_radius_px") or 6.0),
        )
    if "package_corner_radius_px" in modifiers:
        out["package_corner_radius_px"] = _clamp_float(
            modifiers["package_corner_radius_px"],
            8.0,
            20.0,
            float(out.get("package_corner_radius_px") or 12.0),
        )
    if "entrance_presence_scale" in modifiers:
        out["entrance_presence_scale"] = _clamp_float(
            modifiers["entrance_presence_scale"],
            0.85,
            1.25,
            1.0,
        )
    if "rim_glow_alpha" in modifiers:
        out["rim_glow_alpha"] = _clamp_float(
            modifiers["rim_glow_alpha"],
            0.0,
            0.35,
            0.0,
        )
    return out


def apply_entrance_presence_to_android_tuning(
    android_tuning: dict[str, Any] | None,
    entrance_presence_scale: float,
) -> dict[str, Any] | None:
    if not isinstance(android_tuning, dict):
        return android_tuning
    if abs(entrance_presence_scale - 1.0) < 0.001:
        return android_tuning
    out = copy.deepcopy(android_tuning)
    base = _clamp_float(out.get("beam_intensity"), 0.2, 1.0, 0.78)
    out["beam_intensity"] = _clamp_float(base * entrance_presence_scale, 0.2, 1.0, base)
    return out

"""Alert Level kits — bundled presentation + Message Sidekick defaults (cohesion v1)."""

from __future__ import annotations

import copy
from typing import Any

from hails.hails_priority import normalize_priority_level

CONTRACT_PREVIEW_VISUAL_KEY = "previewVisual"


def _load_contract(contract: dict[str, Any] | None) -> dict[str, Any]:
    if contract is not None:
        return contract
    from hails.hails_render_contract import load_hail_render_contract_for_generation

    return load_hail_render_contract_for_generation("v002-beta")


def _preview_visual(contract: dict[str, Any]) -> dict[str, Any]:
    preview = contract.get(CONTRACT_PREVIEW_VISUAL_KEY)
    return preview if isinstance(preview, dict) else {}


def _kits_meta(contract: dict[str, Any]) -> dict[str, Any]:
    kits = _preview_visual(contract).get("alertLevelKits", {})
    return kits if isinstance(kits, dict) else {}


def kit_for_alert_level(alert_level: Any, contract: dict[str, Any] | None = None) -> dict[str, Any]:
    doc = _load_contract(contract)
    level = normalize_priority_level(alert_level)
    raw = _kits_meta(doc).get(level)
    if not isinstance(raw, dict):
        return {}
    return copy.deepcopy(raw)


def kit_presentation_preset_id(alert_level: Any, contract: dict[str, Any] | None = None) -> str | None:
    kit = kit_for_alert_level(alert_level, contract)
    preset = kit.get("presentationPresetId")
    if isinstance(preset, str) and preset.strip():
        return preset.strip()
    return None


def kit_message_tuning_defaults(alert_level: Any, contract: dict[str, Any] | None = None) -> dict[str, Any]:
    kit = kit_for_alert_level(alert_level, contract)
    tuning = kit.get("messageTuning")
    if not isinstance(tuning, dict):
        return {}
    return {str(key): value for key, value in tuning.items()}


def build_kit_summary(alert_level: Any, contract: dict[str, Any] | None = None) -> dict[str, Any]:
    doc = _load_contract(contract)
    level = normalize_priority_level(alert_level)
    kit = kit_for_alert_level(level, doc)
    from hails.hails_message_sidekick import message_registry_for_api

    speed_tiers = message_registry_for_api(doc).get("speed_tiers", {})
    message_tuning = kit_message_tuning_defaults(level, doc)
    entrance_tier = str(message_tuning.get("entrance_speed_tier") or "normal")
    entrance_label = (
        speed_tiers.get(entrance_tier, {}).get("label")
        if isinstance(speed_tiers.get(entrance_tier), dict)
        else entrance_tier
    )
    from hails.hails_presentation_registry import presentation_preset_entry

    preset_id = kit_presentation_preset_id(level, doc)
    preset_entry = presentation_preset_entry(doc, preset_id or "") if preset_id else None
    presentation_label = str((preset_entry or {}).get("label") or preset_id or "")
    return {
        "alert_level": level,
        "kit_id": str(kit.get("kitId") or f"{level}_kit"),
        "label": str(kit.get("label") or presentation_label or level),
        "presentation_preset_id": preset_id,
        "presentation_label": presentation_label,
        "message_entrance_speed_tier": entrance_tier,
        "message_entrance_label": str(entrance_label or entrance_tier),
        "message_tuning": message_tuning,
    }


def kit_adjustments_for_visual(
    visual: dict[str, Any],
    *,
    contract: dict[str, Any] | None = None,
    sidekick_id: str | None = None,
) -> list[dict[str, str]]:
    """Describe kit-driven corrections that apply at render time (for compose hints)."""
    from hails.hails_message_sidekick import (
        default_message_sidekick_id,
        normalize_message_tuning,
    )

    doc = _load_contract(contract)
    level = normalize_priority_level(visual.get("priority_level"))
    kit_tuning = kit_message_tuning_defaults(level, doc)
    if not kit_tuning:
        return []

    sid = sidekick_id or default_message_sidekick_id(doc)
    sidekick_defaults = normalize_message_tuning(sid, None, doc)
    raw_tuning = visual.get("message_tuning")
    if not isinstance(raw_tuning, dict):
        return []

    adjustments: list[dict[str, str]] = []
    for key, kit_value in kit_tuning.items():
        raw_value = raw_tuning.get(key)
        if raw_value is None:
            continue
        if raw_value == kit_value:
            continue
        if raw_value == sidekick_defaults.get(key):
            adjustments.append(
                {
                    "path": f"/visual/message_tuning/{key}",
                    "from": str(raw_value),
                    "to": str(kit_value),
                    "reason": f"{level} kit",
                }
            )
    return adjustments

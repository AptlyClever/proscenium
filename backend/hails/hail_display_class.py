"""Display class resolution for Grid / paint_box silhouette v2 (fleet-aware)."""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

from hails.hails_priority import normalize_priority_level

DISPLAY_CLASS_STICK_OLED = "stick_oled"
DISPLAY_CLASS_PROJECTOR = "projector"
VALID_DISPLAY_CLASSES = frozenset({DISPLAY_CLASS_STICK_OLED, DISPLAY_CLASS_PROJECTOR})

# Module lives in backend/hails/: parents[2] is the repo root in dev and /
# in Docker (where readiness config is copied to /config).
REPO_ROOT = Path(__file__).resolve().parents[2]
FLEET_YAML = REPO_ROOT / "config" / "hails" / "google-tv-fleet.v001.yaml"
DELIVERY_TARGETS_JSON = REPO_ROOT / "config" / "hails" / "hail-delivery-targets.json"


def normalize_display_class(value: Any) -> str:
    raw = str(value or "").strip().lower()
    if raw in VALID_DISPLAY_CLASSES:
        return raw
    return DISPLAY_CLASS_STICK_OLED


@lru_cache(maxsize=1)
def _fleet_display_class_by_room() -> dict[str, str]:
    mapping: dict[str, str] = {}
    if FLEET_YAML.is_file():
        try:
            import yaml  # type: ignore

            doc = yaml.safe_load(FLEET_YAML.read_text(encoding="utf-8"))
            devices = doc.get("devices") if isinstance(doc, dict) else None
            if isinstance(devices, dict):
                for room_id, device in devices.items():
                    if not isinstance(device, dict):
                        continue
                    dc = device.get("display_class")
                    if dc:
                        mapping[str(room_id)] = normalize_display_class(dc)
        except Exception:
            pass
    if DELIVERY_TARGETS_JSON.is_file():
        try:
            doc = json.loads(DELIVERY_TARGETS_JSON.read_text(encoding="utf-8"))
            targets = doc.get("targets") if isinstance(doc, dict) else None
            if isinstance(targets, dict):
                for room_id, target in targets.items():
                    if not isinstance(target, dict):
                        continue
                    dc = target.get("display_class")
                    if dc:
                        mapping[str(room_id)] = normalize_display_class(dc)
        except Exception:
            pass
    return mapping


def display_class_for_room(room_id: str | None) -> str | None:
    if not room_id:
        return None
    return _fleet_display_class_by_room().get(str(room_id).strip())


def display_class_for_delivery_target(target_id: str | None) -> str:
    return display_class_for_room(target_id) or DISPLAY_CLASS_STICK_OLED


def resolve_display_class_for_hail(
    hail_record: dict[str, Any],
    visual: dict[str, Any] | None = None,
) -> str:
    vis = visual if isinstance(visual, dict) else {}
    explicit = vis.get("display_class") or vis.get("preview_display_class")
    if explicit:
        return normalize_display_class(explicit)

    preview_room = vis.get("preview_room_id")
    if preview_room:
        resolved = display_class_for_room(str(preview_room))
        if resolved:
            return resolved

    routes = (
        hail_record.get("delivery_policy", {}).get("routes")
        if isinstance(hail_record.get("delivery_policy"), dict)
        else []
    ) or []
    enabled = next((r for r in routes if isinstance(r, dict) and r.get("enabled") is not False), None)
    if isinstance(enabled, dict):
        for key in ("destination_room_id", "launch_room_id"):
            room = enabled.get(key)
            resolved = display_class_for_room(str(room) if room else None)
            if resolved:
                return resolved

    return DISPLAY_CLASS_STICK_OLED


def _tier_block(contract: dict[str, Any], display_class: str) -> dict[str, Any]:
    paint_box = contract.get("previewVisual", {}).get("paintBox", {})
    if not isinstance(paint_box, dict):
        return {}
    presets = paint_box.get("displayClassPresets")
    if isinstance(presets, dict):
        preset = presets.get(display_class)
        if isinstance(preset, dict):
            tiers = preset.get("tiers")
            if isinstance(tiers, dict):
                return tiers
    legacy = paint_box.get("tiers")
    return legacy if isinstance(legacy, dict) else {}


def _announce_block(contract: dict[str, Any], display_class: str) -> dict[str, Any] | None:
    if display_class != DISPLAY_CLASS_PROJECTOR:
        return None
    paint_box = contract.get("previewVisual", {}).get("paintBox", {})
    if not isinstance(paint_box, dict):
        return None
    presets = paint_box.get("displayClassPresets")
    if not isinstance(presets, dict):
        return None
    preset = presets.get(DISPLAY_CLASS_PROJECTOR)
    if not isinstance(preset, dict):
        return None
    announce = preset.get("announce")
    return announce if isinstance(announce, dict) else None


def resolve_paintbox_tier_meta(
    contract: dict[str, Any],
    tier_id: str,
    *,
    display_class: str | None = None,
    priority_level: str | None = None,
) -> dict[str, Any]:
    """Return tier metadata including width/height fractions and region tuning."""
    dc = normalize_display_class(display_class)
    priority = normalize_priority_level(priority_level)
    announce = _announce_block(contract, dc)
    if priority == "red" and announce:
        return dict(announce)

    tiers = _tier_block(contract, dc)
    tier = tiers.get(tier_id) if isinstance(tiers, dict) else None
    if not isinstance(tier, dict):
        tier = tiers.get("medium", {}) if isinstance(tiers, dict) else {}
    return dict(tier) if isinstance(tier, dict) else {}

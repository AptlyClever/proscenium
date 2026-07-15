"""Sanitize and validate LCARD hail policy edits in app_settings."""

from __future__ import annotations

from typing import Any

from lcard_hail_seed import load_lcard_hail_seed

KNOWN_ROOM_IDS = frozenset({"arcade", "master_bedroom", "away_team"})


def _as_trimmed_string(value: Any) -> str | None:
    if not isinstance(value, str):
        return None
    trimmed = value.strip()
    return trimmed if trimmed else None


def _filter_room_ids(room_ids: Any) -> list[str]:
    if not isinstance(room_ids, list):
        return []
    filtered: list[str] = []
    seen: set[str] = set()
    for item in room_ids:
        room_id = _as_trimmed_string(item)
        if not room_id or room_id not in KNOWN_ROOM_IDS or room_id in seen:
            continue
        seen.add(room_id)
        filtered.append(room_id)
    return filtered


def _baseline_hail_ids(previous_hails: Any) -> set[str]:
    if isinstance(previous_hails, list) and previous_hails:
        ids = {_as_trimmed_string(item.get("id")) for item in previous_hails if isinstance(item, dict)}
        return {item for item in ids if item}
    seed_ids = {_as_trimmed_string(item.get("id")) for item in load_lcard_hail_seed()}
    return {item for item in seed_ids if item}


def sanitize_lcard_hails_for_store(
    hails: Any,
    *,
    previous_hails: Any = None,
) -> list[dict[str, Any]]:
    if not isinstance(hails, list):
        raise ValueError("hails must be an array")

    allowed_ids = _baseline_hail_ids(previous_hails)
    if not allowed_ids:
        raise ValueError("no baseline hail ids available for management")

    incoming_ids = []
    sanitized: list[dict[str, Any]] = []

    for raw in hails:
        if not isinstance(raw, dict):
            raise ValueError("each hail must be an object")
        hail_id = _as_trimmed_string(raw.get("id"))
        if not hail_id:
            raise ValueError("each hail requires id")
        if hail_id not in allowed_ids:
            raise ValueError("unknown hail id: " + hail_id)
        incoming_ids.append(hail_id)

        enabled = raw.get("enabled")
        if enabled is None:
            enabled_bool = True
        elif not isinstance(enabled, bool):
            raise ValueError("enabled must be boolean for " + hail_id)
        else:
            enabled_bool = enabled

        rooms_src = raw.get("rooms") if isinstance(raw.get("rooms"), dict) else {}
        allowed_source_room_ids = _filter_room_ids(
            rooms_src.get("allowed_source_room_ids") or rooms_src.get("allowedSourceRoomIds")
        )
        allowed_target_room_ids = _filter_room_ids(
            rooms_src.get("allowed_target_room_ids") or rooms_src.get("allowedTargetRoomIds")
        )
        if not allowed_source_room_ids or not allowed_target_room_ids:
            raise ValueError("each hail requires at least one known source and target room")

        baseline = _find_baseline_hail(previous_hails, hail_id) or _find_baseline_hail(load_lcard_hail_seed(), hail_id)
        if not baseline:
            raise ValueError("missing baseline hail definition for " + hail_id)

        merged = dict(baseline)
        merged["enabled"] = enabled_bool
        merged["rooms"] = {
            **(merged.get("rooms") if isinstance(merged.get("rooms"), dict) else {}),
            "allowed_source_room_ids": allowed_source_room_ids,
            "allowed_target_room_ids": allowed_target_room_ids,
        }
        sanitized.append(merged)

    if set(incoming_ids) != allowed_ids:
        raise ValueError("hail create/delete is not allowed in v001")

    return sanitized


def _find_baseline_hail(hails: Any, hail_id: str) -> dict[str, Any] | None:
    if not isinstance(hails, list):
        return None
    for item in hails:
        if isinstance(item, dict) and _as_trimmed_string(item.get("id")) == hail_id:
            return dict(item)
    return None

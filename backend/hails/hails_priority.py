"""Hail priority bands — presentation intent. Room-bias from name is deferred."""

from __future__ import annotations

import re
from typing import Any

from hails.hails_delivery_policy import KNOWN_ROOM_IDS

PRIORITY_LEVELS: tuple[str, ...] = ("green", "yellow", "red")
DEFAULT_PRIORITY_LEVEL = "green"

# Preserved for deferred cross-room signaling (chain-priority-room-bias-ui).
_ROOM_NAME_ALIASES: tuple[tuple[str, str], ...] = (
    ("master bedroom", "master_bedroom"),
    ("master_bedroom", "master_bedroom"),
    ("away team", "away_team"),
    ("away_team", "away_team"),
    ("arcade", "arcade"),
)


def _trimmed(value: Any) -> str:
    return value.strip() if isinstance(value, str) else ""


def normalize_priority_level(value: Any) -> str:
    normalized = _trimmed(value).lower()
    if normalized in PRIORITY_LEVELS:
        return normalized
    return DEFAULT_PRIORITY_LEVEL


def priority_applies_room_bias(priority_level: str) -> bool:
    """Deferred — room-bias not active in V1 compose."""
    return False


def resolve_destination_room_from_name(name: Any) -> str | None:
    """Match known room aliases in hail name only (case-insensitive). Deferred for routing."""
    text = _trimmed(name).lower()
    if not text:
        return None
    for alias, room_id in sorted(_ROOM_NAME_ALIASES, key=lambda pair: len(pair[0]), reverse=True):
        pattern = r"(?<![a-z0-9_])" + re.escape(alias) + r"(?![a-z0-9_])"
        if re.search(pattern, text):
            return room_id if room_id in KNOWN_ROOM_IDS else None
    return None


def apply_priority_destination_bias(hail: dict[str, Any]) -> dict[str, Any]:
    """No-op in V1 — operator route picker is authoritative until step 8 repromotes."""
    hail.pop("delivery_policy_meta", None)
    return hail

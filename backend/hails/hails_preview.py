"""Static Hail management preview — contract-derived payload and validation.

Used by the Axiom Hails visual contract editor. Does not contact LCARD,
Android, or display runtimes.
"""

from __future__ import annotations

import copy
import json
from functools import lru_cache
from pathlib import Path
from typing import Any

from hails.hails_domain import (
    KNOWN_PALETTE_IDS,
    KNOWN_PLACEMENT_IDS,
    _normalized,
    _validate_common,
)
from hails.hails_glyph_render import is_google_tv_glyph_deliverable, resolve_glyph_render
from hails.hail_display_class import (
    DISPLAY_CLASS_STICK_OLED,
    resolve_display_class_for_hail,
)
from hails.hails_render_contract import (
    android_effect_tuning_subset,
    build_consumer_render_payload,
    capability_summary_for_effect,
    effect_registry_entry,
    load_hail_render_contract,
    normalize_effect_tuning,
    normalize_named_effect_id,
)

DURATION_MS_MIN = 1000
DURATION_MS_MAX = 120_000
MESSAGE_MAX_LENGTH = 120

ROOM_LABELS = {
    "arcade": "Arcade",
    "master_bedroom": "Master Bedroom",
    "away_team": "Away Team",
}


def _display_class_label(display_class: str) -> str:
    return "projector" if display_class == "projector" else "stick / OLED"


def preview_sizing_summary(record: dict[str, Any], payload: dict[str, Any]) -> dict[str, Any]:
    visual = record.get("visual") if isinstance(record.get("visual"), dict) else {}
    room_id = str(visual.get("preview_room_id") or "").strip() or None
    if not room_id:
        routes = (
            record.get("delivery_policy", {}).get("routes")
            if isinstance(record.get("delivery_policy"), dict)
            else []
        ) or []
        enabled = next((r for r in routes if isinstance(r, dict) and r.get("enabled") is not False), None)
        if isinstance(enabled, dict):
            dest = enabled.get("destination_room_id")
            room_id = str(dest).strip() if dest else None
    display_class = str(payload.get("display_class") or "").strip() or resolve_display_class_for_hail(
        record,
        visual,
    )
    room_label = ROOM_LABELS.get(room_id or "", room_id.replace("_", " ").title() if room_id else "")
    label = (
        f"Sized for: {room_label} ({_display_class_label(display_class)})"
        if room_id and room_label
        else f"Sized for: stick / OLED ({_display_class_label(DISPLAY_CLASS_STICK_OLED)})"
    )
    return {
        "room_id": room_id,
        "room_label": room_label or None,
        "display_class": display_class,
        "label": label,
    }


def _repo_root() -> Path:
    module_dir = Path(__file__).resolve().parent
    # Package lives in backend/hails; walk up to find config/ (repo root in dev,
    # /app in Docker where backend is copied flat).
    for candidate in (module_dir, *module_dir.parents):
        if (candidate / "config" / "lcard").is_dir():
            return candidate
    return module_dir.parents[1]


@lru_cache(maxsize=1)
def load_renderer_readiness() -> dict[str, Any]:
    path = _repo_root() / "config" / "lcard" / "hail-renderer-readiness.json"
    with path.open(encoding="utf-8") as fh:
        return json.load(fh)


def _contract_duration_bounds() -> tuple[int, int]:
    doc = load_hail_render_contract()
    custom = doc.get("previewVisual", {}).get("previewTiming", {}).get("customMs", {})
    return int(custom.get("min", DURATION_MS_MIN)), int(custom.get("max", DURATION_MS_MAX))


def _contract_message_max_length() -> int:
    return int(load_hail_render_contract().get("message", {}).get("maxLength", MESSAGE_MAX_LENGTH))


def collect_hail_validation_warnings(
    record: dict[str, Any],
    *,
    custom_glyphs: dict[str, dict[str, Any]] | None = None,
) -> list[dict[str, str]]:
    """Non-blocking warnings for operator preview (production scope hints)."""
    warnings: list[dict[str, str]] = []
    visual = record.get("visual") if isinstance(record.get("visual"), dict) else {}
    icon = record.get("icon") if isinstance(record.get("icon"), dict) else {}
    doc = load_hail_render_contract()
    effect_id = normalize_named_effect_id(visual.get("effect_id"))
    entry = effect_registry_entry(doc, effect_id)
    caps = entry.get("capabilities") if isinstance(entry, dict) else {}
    android = (caps.get("android") if isinstance(caps, dict) else None) or "none"
    if android == "none":
        label = entry.get("label") if isinstance(entry, dict) else effect_id
        warnings.append(
            {
                "path": "/visual/effect_id",
                "message": (
                    f"{label} ({effect_id}) is not delivered to Google TV — "
                    "Paintbox shows glyph and message only"
                ),
            }
        )
    elif android == "partial":
        note = caps.get("android_note") if isinstance(caps, dict) else None
        if note:
            warnings.append({"path": "/visual/effect_id", "message": str(note)})
        tuning = normalize_effect_tuning(effect_id, visual.get("effect_tuning"), doc)
        android_subset = android_effect_tuning_subset(effect_id, tuning, doc)
        if tuning and len(android_subset) < len(tuning):
            unsupported = sorted(set(tuning.keys()) - set(android_subset.keys()))
            if unsupported:
                warnings.append(
                    {
                        "path": "/visual/effect_tuning",
                        "message": (
                            "TV transporter path ignores tuning keys: "
                            + ", ".join(unsupported)
                        ),
                    }
                )

    hail_id = (record.get("id") or "").strip()
    if hail_id and hail_id not in load_renderer_readiness():
        warnings.append(
            {
                "path": "/id",
                "message": "No renderer readiness metadata for this hail id",
            }
        )

    duration = visual.get("duration_ms")
    if duration is not None:
        try:
            d = int(duration)
            d_min, d_max = _contract_duration_bounds()
            if d <= d_min + 500 or d >= d_max - 5000:
                warnings.append(
                    {
                        "path": "/visual/duration_ms",
                        "message": f"duration_ms {d} is near contract bounds ({d_min}–{d_max})",
                    }
                )
        except (TypeError, ValueError):
            pass

    glyph_id = (icon.get("value") or "").strip()
    if glyph_id:
        glyph_render = resolve_glyph_render(glyph_id, custom_glyphs=custom_glyphs)
        if not is_google_tv_glyph_deliverable(glyph_render):
            if glyph_id.startswith("custom-"):
                warnings.append(
                    {
                        "path": "/icon/value",
                        "message": (
                            "Custom glyph has no deliverable mark for Google TV — "
                            "save a procedural graph or choose a built-in glyph"
                        ),
                    }
                )
            else:
                warnings.append(
                    {
                        "path": "/icon/value",
                        "message": (
                            f"Glyph {glyph_id} is not on Google TV overlay — "
                            "delivery will fall back to default"
                        ),
                    }
                )

    return warnings


def validate_hail_draft(
    record: dict[str, Any],
    *,
    glyph_allowlist: tuple[str, ...] | None = None,
) -> list[dict[str, str]]:
    """Return blocking validation errors for a normalized hail draft."""
    errors: list[dict[str, str]] = []
    _validate_common(record, errors, glyph_allowlist=glyph_allowlist)

    message = record.get("message") if isinstance(record.get("message"), dict) else {}
    short_text = (message.get("short_text") or "").strip()
    max_len = _contract_message_max_length()
    if short_text and len(short_text) > max_len:
        errors.append(
            {
                "path": "/message/short_text",
                "message": f"message short text must be at most {max_len} characters",
            }
        )

    visual = record.get("visual") if isinstance(record.get("visual"), dict) else {}
    duration = visual.get("duration_ms")
    if duration is not None:
        try:
            d = int(duration)
            d_min, d_max = _contract_duration_bounds()
            if d < d_min or d > d_max:
                errors.append(
                    {
                        "path": "/visual/duration_ms",
                        "message": f"duration_ms must be between {d_min} and {d_max}",
                    }
                )
        except (TypeError, ValueError):
            errors.append({"path": "/visual/duration_ms", "message": "duration_ms must be an integer"})

    return errors


def placement_summary(record: dict[str, Any]) -> dict[str, Any]:
    visual = record.get("visual") if isinstance(record.get("visual"), dict) else {}
    mode = (visual.get("placement_mode") or "preset").strip()
    if mode == "custom":
        return {
            "placement_mode": "custom",
            "x_percent": visual.get("x_percent"),
            "y_percent": visual.get("y_percent"),
            "label": f"custom ({visual.get('x_percent')}%, {visual.get('y_percent')}%)",
        }
    placement_id = visual.get("placement_id") or "upper_center"
    return {
        "placement_mode": "preset",
        "placement_id": placement_id,
        "label": str(placement_id).replace("_", " "),
    }


def renderer_readiness_summary(hail_id: str | None) -> dict[str, Any]:
    if not hail_id:
        return {"status": "unknown", "lines": ["Renderer: pending overlay adapter"]}
    entry = load_renderer_readiness().get(hail_id)
    if not entry:
        return {"status": "pending", "lines": ["Renderer: pending overlay adapter"]}
    lines = [
        f"Primary renderer: {entry.get('primary_renderer', 'unknown')}",
        f"Platform scope: {entry.get('platform_scope', 'unknown')}",
    ]
    if entry.get("operator_note"):
        lines.append(str(entry["operator_note"]))
    rooms = entry.get("rooms") if isinstance(entry.get("rooms"), dict) else {}
    ready_rooms = [rid for rid, meta in rooms.items() if isinstance(meta, dict) and meta.get("overlay_ready")]
    if ready_rooms:
        lines.append(f"Overlay-ready rooms: {', '.join(sorted(ready_rooms))}")
    return {"status": "ready", "lines": lines, "entry": entry}


def derive_hail_management_preview(
    record: dict[str, Any],
    *,
    previous: dict[str, Any] | None = None,
    glyph_allowlist: tuple[str, ...] | None = None,
    custom_glyphs: dict[str, dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """Merge draft onto previous (when provided), validate, and project render payload."""
    working = copy.deepcopy(record)
    if previous is not None:
        working["id"] = previous.get("id")
    normalized = _normalized(working, previous=previous)
    errors = validate_hail_draft(normalized, glyph_allowlist=glyph_allowlist)
    warnings = collect_hail_validation_warnings(normalized, custom_glyphs=custom_glyphs)
    payload = build_consumer_render_payload(normalized, custom_glyphs=custom_glyphs)
    readiness = renderer_readiness_summary(normalized.get("id"))
    return {
        "record": normalized,
        "render_payload": payload,
        "placement_summary": placement_summary(normalized),
        "preview_sizing": preview_sizing_summary(normalized, payload),
        "renderer_readiness": readiness,
        "validation": {
            "errors": errors,
            "warnings": warnings,
            "valid": len(errors) == 0,
        },
        "allowlists": {
            "glyphs": list(glyph_allowlist)
            if glyph_allowlist is not None
            else list(load_hail_render_contract().get("glyphs", {}).get("allowlist") or []),
            "effects": list(load_hail_render_contract().get("effects", {}).get("allowlist") or []),
            "size_tiers": ["small", "medium", "large"],
            "palette_ids": list(KNOWN_PALETTE_IDS),
            "placement_ids": list(KNOWN_PLACEMENT_IDS),
        },
    }


def hail_list_contract_summary(record: dict[str, Any]) -> dict[str, Any]:
    """Compact summary fields for Hails list rows."""
    visual = record.get("visual") if isinstance(record.get("visual"), dict) else {}
    icon = record.get("icon") if isinstance(record.get("icon"), dict) else {}
    payload = build_consumer_render_payload(record)
    readiness = renderer_readiness_summary(record.get("id"))
    routes = (
        record.get("delivery_policy", {}).get("routes")
        if isinstance(record.get("delivery_policy"), dict)
        else []
    ) or []
    enabled_route = next((r for r in routes if r.get("enabled") is not False), None)
    return {
        "id": record.get("id"),
        "name": record.get("name"),
        "message": (record.get("message") or {}).get("short_text") if isinstance(record.get("message"), dict) else "",
        "enabled": record.get("enabled") is not False,
        "source_room_id": enabled_route.get("launch_room_id") if enabled_route else None,
        "target_room_id": enabled_route.get("destination_room_id") if enabled_route else None,
        "glyph_id": icon.get("value") or "default",
        "effect_id": payload.get("effect_id"),
        "size_tier": payload.get("size_tier"),
        "size_code": payload.get("size_code"),
        "placement": placement_summary(record),
        "duration_ms": visual.get("duration_ms"),
        "renderer_readiness_status": readiness.get("status"),
        "renderer_readiness_summary": readiness.get("lines", [""])[0],
    }

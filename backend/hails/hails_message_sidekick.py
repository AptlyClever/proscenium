"""Message Sidekick registry — stable-phase copy presentation (parallel to effect registry)."""

from __future__ import annotations

import copy
from typing import Any

from hails.hails_priority import normalize_priority_level

CONTRACT_PREVIEW_VISUAL_KEY = "previewVisual"


def _preview_visual(contract: dict[str, Any]) -> dict[str, Any]:
    preview = contract.get(CONTRACT_PREVIEW_VISUAL_KEY)
    return preview if isinstance(preview, dict) else {}


def _load_contract(contract: dict[str, Any] | None) -> dict[str, Any]:
    if contract is not None:
        return contract
    from hails.hails_render_contract import load_hail_render_contract_for_generation

    return load_hail_render_contract_for_generation("v002-beta")

MESSAGE_SPEED_TIERS: tuple[str, ...] = ("slow", "normal", "quick")
DEFAULT_MESSAGE_SIDEKICK_ID = "secondary_fade"
OPACITY_MIN = 0.2
OPACITY_MAX = 1.0


def _message_registry_meta(contract: dict[str, Any]) -> dict[str, Any]:
    registry = _preview_visual(contract).get("messageRegistry", {})
    return registry if isinstance(registry, dict) else {}


def message_speed_tiers(contract: dict[str, Any] | None = None) -> dict[str, dict[str, Any]]:
    doc = _load_contract(contract)
    raw = _message_registry_meta(doc).get("speedTiers", {})
    if not isinstance(raw, dict):
        return {}
    return {str(key): value for key, value in raw.items() if isinstance(value, dict)}


def message_registry_entries(contract: dict[str, Any] | None = None) -> dict[str, dict[str, Any]]:
    doc = _load_contract(contract)
    raw = _message_registry_meta(doc).get("entries", {})
    if not isinstance(raw, dict):
        return {}
    return {str(key): entry for key, entry in raw.items() if isinstance(entry, dict)}


def default_message_sidekick_id(contract: dict[str, Any] | None = None) -> str:
    doc = _load_contract(contract)
    meta = _message_registry_meta(doc)
    default_id = meta.get("defaultSidekickId")
    if isinstance(default_id, str) and default_id.strip():
        return default_id.strip()
    for sidekick_id, entry in message_registry_entries(doc).items():
        if entry.get("default") is True and (entry.get("status") or "active") == "active":
            return sidekick_id
    return DEFAULT_MESSAGE_SIDEKICK_ID


def message_sidekick_entry(contract: dict[str, Any], sidekick_id: str) -> dict[str, Any] | None:
    normalized = (sidekick_id or "").strip() or default_message_sidekick_id(contract)
    return message_registry_entries(contract).get(normalized)


def resolve_speed_tier_ms(
    tier: str | None,
    *,
    contract: dict[str, Any] | None = None,
) -> tuple[int, int]:
    doc = _load_contract(contract)
    normalized = (tier or "normal").strip().lower()
    if normalized not in MESSAGE_SPEED_TIERS:
        normalized = "normal"
    tiers = message_speed_tiers(doc)
    row = tiers.get(normalized) or tiers.get("normal") or {}
    entrance = int(row.get("entrance_ms") or 480)
    exit_ms = int(row.get("exit_ms") or 360)
    return max(80, entrance), max(80, exit_ms)


def _message_tuning_schema(entry: dict[str, Any]) -> list[dict[str, Any]]:
    tuning = entry.get("tuning") if isinstance(entry.get("tuning"), dict) else {}
    variables = tuning.get("variables")
    if not isinstance(variables, list):
        return []
    return [row for row in variables if isinstance(row, dict) and (row.get("key") or "").strip()]


def _message_tuning_defaults(entry: dict[str, Any]) -> dict[str, Any]:
    tuning = entry.get("tuning") if isinstance(entry.get("tuning"), dict) else {}
    defaults = tuning.get("defaults")
    return copy.deepcopy(defaults) if isinstance(defaults, dict) else {}


def _coerce_message_tuning_value(variable: dict[str, Any], raw: Any) -> Any | None:
    var_type = (variable.get("type") or "range").strip()
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
    if value < minimum:
        value = minimum
    elif value > maximum:
        value = maximum
    if float(value).is_integer() and abs(value - int(value)) < 1e-9:
        return int(value)
    return value


def normalize_message_tuning(
    sidekick_id: str,
    tuning: Any,
    contract: dict[str, Any] | None = None,
) -> dict[str, Any]:
    doc = _load_contract(contract)
    entry = message_sidekick_entry(doc, sidekick_id)
    if entry is None:
        return {}
    defaults = _message_tuning_defaults(entry)
    if not isinstance(tuning, dict):
        return defaults

    schema = {var["key"]: var for var in _message_tuning_schema(entry)}
    out = copy.deepcopy(defaults)
    for key, raw in tuning.items():
        variable = schema.get(str(key))
        if variable is None:
            continue
        coerced = _coerce_message_tuning_value(variable, raw)
        if coerced is not None:
            out[str(key)] = coerced
    return out


def normalize_message_sidekick_id(sidekick_id: str | None, contract: dict[str, Any] | None = None) -> str:
    doc = _load_contract(contract)
    normalized = (sidekick_id or "").strip()
    if normalized and message_sidekick_entry(doc, normalized) is not None:
        return normalized
    return default_message_sidekick_id(doc)


def resolve_message_sidekick_identity(
    sidekick_id: str,
    tuning: dict[str, Any] | None,
    *,
    contract: dict[str, Any] | None = None,
) -> dict[str, Any]:
    doc = _load_contract(contract)
    normalized_id = normalize_message_sidekick_id(sidekick_id, doc)
    entry = message_sidekick_entry(doc, normalized_id) or {}
    identity = entry.get("identity") if isinstance(entry.get("identity"), dict) else {}
    merged_tuning = normalize_message_tuning(normalized_id, tuning, doc)

    entrance_tier = str(
        merged_tuning.get("entrance_speed_tier")
        or identity.get("entrance_speed_tier")
        or "normal"
    )
    exit_tier = str(
        merged_tuning.get("exit_speed_tier")
        or identity.get("exit_speed_tier")
        or entrance_tier
    )
    if entrance_tier not in MESSAGE_SPEED_TIERS:
        entrance_tier = "normal"
    if exit_tier not in MESSAGE_SPEED_TIERS:
        exit_tier = entrance_tier

    opacity_raw = merged_tuning.get("opacity", identity.get("opacity_default", 0.92))
    try:
        opacity = float(opacity_raw)
    except (TypeError, ValueError):
        opacity = 0.92
    opacity = max(OPACITY_MIN, min(OPACITY_MAX, opacity))

    entrance_ms, _ = resolve_speed_tier_ms(entrance_tier, contract=doc)
    _, exit_ms = resolve_speed_tier_ms(exit_tier, contract=doc)

    return {
        "sidekick_id": normalized_id,
        "label": entry.get("label") or normalized_id,
        "entrance_style": str(identity.get("entrance_style") or "fade"),
        "exit_style": str(identity.get("exit_style") or identity.get("entrance_style") or "fade"),
        "entrance_speed_tier": entrance_tier,
        "exit_speed_tier": exit_tier,
        "entrance_ms": entrance_ms,
        "exit_ms": exit_ms,
        "opacity": opacity,
        "color_source": str(identity.get("color_source") or "palette_message"),
    }


def message_tuning_defaults_for_priority(priority_level: Any) -> dict[str, Any]:
    """Alert Level kit message tuning — explicit non-default message_tuning wins."""
    from hails.hails_alert_level_kit import kit_message_tuning_defaults

    kit_defaults = kit_message_tuning_defaults(priority_level)
    if kit_defaults:
        return kit_defaults
    priority = normalize_priority_level(priority_level)
    if priority == "red":
        return {"entrance_speed_tier": "quick"}
    return {}


def resolve_effective_message_tuning(
    visual: dict[str, Any],
    sidekick_id: str,
    *,
    contract: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Merge sidekick defaults, priority suggestions, and persisted tuning.

    Domain save fills ``message_tuning`` with sidekick defaults (e.g. ``normal``).
    Priority suggestions override those filled defaults; only operator-changed
    values (non-default) win over priority.
    """
    doc = _load_contract(contract)
    sidekick_defaults = normalize_message_tuning(sidekick_id, None, doc)
    priority_defaults = message_tuning_defaults_for_priority(visual.get("priority_level"))
    tuning = {**sidekick_defaults, **priority_defaults}

    raw_tuning = visual.get("message_tuning")
    if not isinstance(raw_tuning, dict):
        return tuning

    for key, value in raw_tuning.items():
        if key in priority_defaults and value == sidekick_defaults.get(key):
            continue
        coerced_key = str(key)
        schema = {var["key"]: var for var in _message_tuning_schema(message_sidekick_entry(doc, sidekick_id) or {})}
        variable = schema.get(coerced_key)
        if variable is None:
            continue
        coerced = _coerce_message_tuning_value(variable, value)
        if coerced is not None:
            tuning[coerced_key] = coerced
    return tuning


def build_message_entity(
    hail_record: dict[str, Any],
    *,
    contract: dict[str, Any] | None = None,
    stable_hold_ms: int | None = None,
) -> dict[str, Any]:
    """Compose Message Sidekick entity — stable-phase timing only (not effect-owned)."""
    doc = _load_contract(contract)
    message = hail_record.get("message") if isinstance(hail_record.get("message"), dict) else {}
    visual = hail_record.get("visual") if isinstance(hail_record.get("visual"), dict) else {}

    text = str(message.get("short_text") or "").strip()
    sidekick_id = normalize_message_sidekick_id(visual.get("message_sidekick_id"), doc)
    tuning = resolve_effective_message_tuning(visual, sidekick_id, contract=doc)
    identity = resolve_message_sidekick_identity(
        sidekick_id,
        tuning or None,
        contract=doc,
    )

    hold = stable_hold_ms
    if hold is None:
        raw_duration = visual.get("duration_ms")
        if raw_duration is not None:
            try:
                hold = int(raw_duration)
            except (TypeError, ValueError):
                hold = None
    if hold is None:
        hold = 5000

    entrance_ms = int(identity["entrance_ms"])
    exit_ms = int(identity["exit_ms"])
    exit_offset_ms = max(0, int(hold) - exit_ms)

    entity: dict[str, Any] = {
        "text": text,
        "sidekick_id": identity["sidekick_id"],
        "entrance_style": identity["entrance_style"],
        "exit_style": identity["exit_style"],
        "entrance_speed_tier": identity["entrance_speed_tier"],
        "exit_speed_tier": identity["exit_speed_tier"],
        "entrance_ms": entrance_ms,
        "exit_ms": exit_ms,
        "opacity": identity["opacity"],
        "color_source": identity["color_source"],
        "entrance_offset_ms": 0,
        "exit_offset_ms": exit_offset_ms,
        "stable_hold_ms": int(hold),
    }
    return entity


def message_tuning_schema(entry: dict[str, Any]) -> list[dict[str, Any]]:
    return _message_tuning_schema(entry)


def validate_message_tuning(
    sidekick_id: str,
    tuning: Any,
    contract: dict[str, Any] | None = None,
) -> list[dict[str, str]]:
    doc = _load_contract(contract)
    normalized_id = normalize_message_sidekick_id(sidekick_id, doc)
    entry = message_sidekick_entry(doc, normalized_id)
    if entry is None:
        return [{"path": "/visual/message_sidekick_id", "message": f"unknown message_sidekick_id: {normalized_id}"}]
    if tuning is None:
        return []
    if not isinstance(tuning, dict):
        return [{"path": "/visual/message_tuning", "message": "message_tuning must be an object"}]

    errors: list[dict[str, str]] = []
    schema = {var["key"]: var for var in _message_tuning_schema(entry)}
    for key, raw in tuning.items():
        variable = schema.get(str(key))
        if variable is None:
            errors.append({"path": f"/visual/message_tuning/{key}", "message": "unknown tuning key for message sidekick"})
            continue
        if _coerce_message_tuning_value(variable, raw) is None:
            errors.append({"path": f"/visual/message_tuning/{key}", "message": "value out of range or invalid type"})
    return errors


def message_registry_for_api(contract: dict[str, Any] | None = None) -> dict[str, Any]:
    doc = _load_contract(contract)
    meta = _message_registry_meta(doc)
    entries_out: list[dict[str, Any]] = []
    for sidekick_id, entry in message_registry_entries(doc).items():
        tuning = entry.get("tuning") if isinstance(entry.get("tuning"), dict) else {}
        variables = []
        for var in _message_tuning_schema(entry):
            public = {k: v for k, v in var.items() if k != "mapsTo"}
            variables.append(public)
        entries_out.append(
            {
                "id": sidekick_id,
                "label": entry.get("label") or sidekick_id,
                "status": entry.get("status") or "active",
                "default": entry.get("default") is True,
                "identity": copy.deepcopy(entry.get("identity") or {}),
                "tuning_variables": variables,
                "tuning_defaults": _message_tuning_defaults(entry),
                "capabilities": entry.get("capabilities") if isinstance(entry.get("capabilities"), dict) else {},
            }
        )
    return {
        "default_sidekick_id": default_message_sidekick_id(doc),
        "speed_tiers": message_speed_tiers(doc),
        "lifecycle_model": meta.get("lifecycleModel") if isinstance(meta.get("lifecycleModel"), dict) else {},
        "entries": entries_out,
    }

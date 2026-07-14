"""First-class Axiom Hail domain: resolution, validation, and effective bridge.

Canonical storage (v001): top-level ``hails`` list in axiom-settings.json.

Compatibility bridge:
- When the domain list is empty, reads fall back to the transitional
  ``app_settings.lcard.hails`` store, then the committed seed
  (``config/lcard/hail-definitions.json``).
- The first domain write materializes the resolved list into ``hails``;
  after that the domain list is canonical and legacy sources are ignored.
- ``effective_lcard_hails`` projects non-archived hails into the LCARD
  effective payload, preserving the existing consumer contract.
"""

from __future__ import annotations

import copy
import re
import unicodedata
from typing import Any

from hails.glyph_registry import hail_glyph_allowlist, registry_delivery_glyph_ids
from hails.hail_effect_field_layout import resolve_effect_footprint_profile
from hails.hails_delivery_policy import (
    apply_delivery_policy_write,
    enrich_hail_for_lcard_effective,
    ensure_hail_delivery_policy,
    reject_list_only_policy_write,
    rooms_compat_from_routes,
    routes_from_hail,
    validate_delivery_routes,
)
from hails.hails_render_contract import (
    active_effect_ids,
    build_consumer_render_payload,
    effect_tuning_schema,
    load_hail_render_contract_for_generation,
    normalize_effect_tuning,
    normalize_effect_variation_id,
    normalize_named_effect_id,
    resolve_registry_tuning_entry,
    validate_effect_tuning,
    validate_effect_variation_id,
)
from hails.hails_message_sidekick import (
    message_sidekick_entry,
    message_tuning_schema,
    normalize_message_sidekick_id,
    normalize_message_tuning,
    validate_message_tuning,
)
from hails.hails_priority import apply_priority_destination_bias, normalize_priority_level
from lcard_hail_seed import load_lcard_hail_seed
from schemas import AxiomStoredSettings

KNOWN_ROOM_IDS: tuple[str, ...] = ("arcade", "master_bedroom", "away_team")
KNOWN_GLYPH_IDS: tuple[str, ...] = registry_delivery_glyph_ids()
KNOWN_CATEGORIES: tuple[str, ...] = ("cute", "status", "summons", "alert")
KNOWN_EFFECT_IDS: tuple[str, ...] = active_effect_ids()
KNOWN_SIZE_TIERS: tuple[str, ...] = ("small", "medium", "large")
KNOWN_EFFECT_FOOTPRINT_PROFILES: tuple[str, ...] = ("compact", "standard", "dramatic")
KNOWN_PALETTE_IDS: tuple[str, ...] = (
    "axiom_dark_cyan",
    "transporter_white",
    "cute_purple",
)
# Variation-era palette ids kept for contract/preview roles; normalized away on hail write.
_DEPRECATED_PALETTE_ALIASES: dict[str, str] = {
    "transporter_generation_next": "transporter_white",
    "transporter_spoon": "transporter_white",
}
KNOWN_PLACEMENT_IDS: tuple[str, ...] = (
    "center_soft",
    "top_right",
    "bottom_right",
    "top_left",
    "bottom_left",
    "upper_center",
    "lower_center",
)

_HAIL_ID_RE = re.compile(r"^hail\.[a-z0-9][a-z0-9_-]*\.[0-9]{3}$")

# Fields an operator may set at create/update time. Everything else is
# preserved from the previous record (or seeded defaults) untouched.
_EDITABLE_SCALARS = ("display_id", "name", "category", "enabled", "archived")

_DEFAULT_VISUAL = {
    "effect_id": "transporter",
    "palette_id": "axiom_dark_cyan",
    "scale": "medium",
    "duration_ms": 5000,
    "placement_id": "upper_center",
    "placement_mode": "preset",
    "anchor": "top_end",
    "reduced_motion_fallback": "static_toast",
    "priority_level": "green",
}
_DEFAULT_AUDIO = {"enabled": False, "audio_id": "", "mode": "future", "volume": "soft", "delay_ms": 350}
_DEFAULT_BEHAVIOR = {"cooldown_sec": 30, "quiet_hours_policy": "respect", "requires_confirmation": False}
_DEFAULT_ADVANCED = {"intensity": 2, "particle_density": 1}


class HailValidationError(ValueError):
    """Validation failure with JSON-pointer-ish paths for the 422 contract."""

    def __init__(self, errors: list[dict[str, str]]):
        self.errors = errors
        super().__init__("; ".join(e["message"] for e in errors))


def _trimmed(value: Any) -> str:
    return value.strip() if isinstance(value, str) else ""


def _filter_room_ids(room_ids: Any) -> list[str]:
    if not isinstance(room_ids, list):
        return []
    seen: set[str] = set()
    out: list[str] = []
    for item in room_ids:
        room_id = _trimmed(item)
        if room_id in KNOWN_ROOM_IDS and room_id not in seen:
            seen.add(room_id)
            out.append(room_id)
    return out


def resolve_hails_with_source(st: AxiomStoredSettings) -> tuple[list[dict[str, Any]], str]:
    """Resolve the working hail list and report where it came from."""
    if st.hails_catalog_materialized:
        raw, source = copy.deepcopy(st.hails), "domain"
    elif st.hails:
        raw, source = copy.deepcopy(st.hails), "domain"
    else:
        legacy = (st.app_settings.get("lcard") or {}).get("hails")
        if isinstance(legacy, list) and legacy:
            raw, source = copy.deepcopy(legacy), "legacy-app-settings"
        else:
            raw, source = copy.deepcopy(load_lcard_hail_seed()), "seed"
    return [ensure_hail_delivery_policy(h) for h in raw], source


def slugify_hail_id(name: str, existing_ids: set[str]) -> str:
    base = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode()
    base = re.sub(r"[^a-z0-9]+", "_", base.lower()).strip("_") or "hail"
    for n in range(1, 1000):
        candidate = f"hail.{base}.{n:03d}"
        if candidate not in existing_ids:
            return candidate
    raise HailValidationError([{"path": "/id", "message": "could not allocate a unique hail id"}])


def next_display_id(hails: list[dict[str, Any]]) -> str:
    numbers = []
    for hail in hails:
        raw = _trimmed(hail.get("display_id"))
        if raw.isdigit():
            numbers.append(int(raw))
    return f"{(max(numbers) + 1) if numbers else 1:03d}"


def _validate_incoming_boolean_scalars(record: dict[str, Any], errors: list[dict[str, str]]) -> None:
    """Reject non-boolean enabled/archived on the raw request body before coercion."""
    for flag in ("enabled", "archived"):
        if flag in record and record[flag] is not None and not isinstance(record[flag], bool):
            errors.append({"path": f"/{flag}", "message": f"{flag} must be boolean"})


def _validate_incoming_effect_variation(
    record: dict[str, Any],
    errors: list[dict[str, str]],
    *,
    previous: dict[str, Any] | None = None,
) -> None:
    visual = record.get("visual") if isinstance(record.get("visual"), dict) else {}
    if "effect_variation_id" not in visual:
        return
    prev_visual = previous.get("visual") if isinstance(previous, dict) and isinstance(previous.get("visual"), dict) else {}
    effect_id = (
        normalize_named_effect_id(_trimmed(visual.get("effect_id")))
        or normalize_named_effect_id(_trimmed(prev_visual.get("effect_id")))
        or "transporter"
    )
    errors.extend(validate_effect_variation_id(effect_id, visual.get("effect_variation_id")))


def _validate_incoming_effect_tuning(
    record: dict[str, Any],
    errors: list[dict[str, str]],
    *,
    previous: dict[str, Any] | None = None,
) -> None:
    visual = record.get("visual") if isinstance(record.get("visual"), dict) else {}
    if "effect_tuning" not in visual:
        return
    prev_visual = previous.get("visual") if isinstance(previous, dict) and isinstance(previous.get("visual"), dict) else {}
    effect_id = (
        normalize_named_effect_id(_trimmed(visual.get("effect_id")))
        or normalize_named_effect_id(_trimmed(prev_visual.get("effect_id")))
        or "transporter"
    )
    variation_id = normalize_effect_variation_id(
        effect_id,
        visual.get("effect_variation_id") if "effect_variation_id" in visual else prev_visual.get("effect_variation_id"),
    )
    errors.extend(validate_effect_variation_id(effect_id, visual.get("effect_variation_id")))
    errors.extend(validate_effect_tuning(effect_id, visual.get("effect_tuning"), variation_id=variation_id))


def _validate_common(
    record: dict[str, Any],
    errors: list[dict[str, str]],
    *,
    glyph_allowlist: tuple[str, ...] | None = None,
    previous: dict[str, Any] | None = None,
) -> None:
    if not _trimmed(record.get("name")):
        errors.append({"path": "/name", "message": "name is required"})
    if not _trimmed(record.get("display_id")):
        errors.append({"path": "/display_id", "message": "display id is required"})
    category = _trimmed(record.get("category"))
    if category and category not in KNOWN_CATEGORIES:
        errors.append({"path": "/category", "message": f"category must be one of: {', '.join(KNOWN_CATEGORIES)}"})

    message = record.get("message") if isinstance(record.get("message"), dict) else {}
    short_text = _trimmed(message.get("short_text"))
    if not short_text:
        errors.append({"path": "/message/short_text", "message": "message short text is required"})
    elif len(short_text) > 120:
        errors.append({"path": "/message/short_text", "message": "message short text must be at most 120 characters"})

    icon = record.get("icon") if isinstance(record.get("icon"), dict) else {}
    glyph = _trimmed(icon.get("value"))
    selectable = set(glyph_allowlist or hail_glyph_allowlist())
    prev_icon = previous.get("icon") if isinstance(previous, dict) and isinstance(previous.get("icon"), dict) else {}
    prev_glyph = _trimmed(prev_icon.get("value"))
    if glyph:
        if glyph in selectable:
            pass
        elif prev_glyph and glyph == prev_glyph and glyph in KNOWN_GLYPH_IDS:
            pass
        elif glyph in registry_delivery_glyph_ids() and glyph not in hail_glyph_allowlist():
            errors.append(
                {
                    "path": "/icon/value",
                    "message": "legacy registry glyphs are deprecated; choose default or a Forge custom glyph",
                }
            )
        else:
            allowed = tuple(sorted(selectable | set(KNOWN_GLYPH_IDS)))
            errors.append({"path": "/icon/value", "message": f"glyph must be one of: {', '.join(allowed)}"})

    visual = record.get("visual") if isinstance(record.get("visual"), dict) else {}
    effect_id = normalize_named_effect_id(_trimmed(visual.get("effect_id")))
    if effect_id and effect_id not in KNOWN_EFFECT_IDS:
        errors.append({"path": "/visual/effect_id", "message": f"effect_id must be one of: {', '.join(KNOWN_EFFECT_IDS)}"})
    resolved_effect = effect_id or "transporter"
    contract = load_hail_render_contract_for_generation("v002-beta")
    resolved_variation = normalize_effect_variation_id(resolved_effect, visual.get("effect_variation_id"), contract)
    if visual.get("effect_variation_id") is not None:
        errors.extend(validate_effect_variation_id(resolved_effect, visual.get("effect_variation_id"), contract))
    if visual.get("effect_tuning") is not None:
        errors.extend(
            validate_effect_tuning(
                resolved_effect,
                visual.get("effect_tuning"),
                contract,
                variation_id=resolved_variation,
            )
        )
    if visual.get("message_tuning") is not None:
        sidekick_id = normalize_message_sidekick_id(visual.get("message_sidekick_id"), contract)
        errors.extend(validate_message_tuning(sidekick_id, visual.get("message_tuning"), contract))
    scale = _trimmed(visual.get("scale"))
    if scale and scale not in KNOWN_SIZE_TIERS:
        errors.append({"path": "/visual/scale", "message": f"scale must be one of: {', '.join(KNOWN_SIZE_TIERS)}"})
    palette_id = _trimmed(visual.get("palette_id"))
    if palette_id and palette_id not in KNOWN_PALETTE_IDS:
        errors.append({"path": "/visual/palette_id", "message": f"palette_id must be one of: {', '.join(KNOWN_PALETTE_IDS)}"})
    duration = visual.get("duration_ms")
    if duration is not None:
        try:
            d = int(duration)
            if d < 1000 or d > 120_000:
                errors.append({"path": "/visual/duration_ms", "message": "duration_ms must be between 1000 and 120000"})
        except (TypeError, ValueError):
            errors.append({"path": "/visual/duration_ms", "message": "duration_ms must be an integer"})
    placement_mode = _trimmed(visual.get("placement_mode")) or "preset"
    if placement_mode not in {"preset", "custom"}:
        errors.append({"path": "/visual/placement_mode", "message": "placement_mode must be preset or custom"})
    if placement_mode == "preset":
        placement_id = _trimmed(visual.get("placement_id"))
        if placement_id and placement_id not in KNOWN_PLACEMENT_IDS:
            errors.append(
                {
                    "path": "/visual/placement_id",
                    "message": f"placement_id must be one of: {', '.join(KNOWN_PLACEMENT_IDS)}",
                }
            )
    if placement_mode == "custom":
        for key in ("x_percent", "y_percent"):
            value = visual.get(key)
            if value is None:
                errors.append({"path": f"/visual/{key}", "message": f"{key} is required for custom placement"})
                continue
            if not isinstance(value, (int, float)) or not (5 <= float(value) <= 95):
                errors.append({"path": f"/visual/{key}", "message": f"{key} must be between 5 and 95"})

    if visual.get("priority_level") is not None:
        raw_priority = _trimmed(visual.get("priority_level")).lower()
        if raw_priority and raw_priority not in {"green", "yellow", "red"}:
            errors.append({"path": "/visual/priority_level", "message": "priority_level must be green, yellow, or red"})
    if visual.get("effect_footprint_profile") is not None:
        raw_profile = _trimmed(visual.get("effect_footprint_profile")).lower()
        if raw_profile and raw_profile not in KNOWN_EFFECT_FOOTPRINT_PROFILES:
            errors.append(
                {
                    "path": "/visual/effect_footprint_profile",
                    "message": f"effect_footprint_profile must be one of: {', '.join(KNOWN_EFFECT_FOOTPRINT_PROFILES)}",
                }
            )

    reject_list_only_policy_write(record, errors)

    delivery = record.get("delivery_policy") if isinstance(record.get("delivery_policy"), dict) else {}
    routes = delivery.get("routes")
    if not isinstance(routes, list):
        errors.append({"path": "/delivery_policy/routes", "message": "delivery_policy.routes is required"})
    else:
        errors.extend(
            validate_delivery_routes(
                routes,
                enabled=record.get("enabled") is not False,
                archived=record.get("archived") is True,
            )
        )


def _normalized(record: dict[str, Any], previous: dict[str, Any] | None) -> dict[str, Any]:
    """Merge an edit onto its previous record, normalizing managed fields."""
    base = copy.deepcopy(previous) if previous else {}

    out = dict(base)
    out["schema_version"] = base.get("schema_version", 1)
    out["id"] = _trimmed(record.get("id")) or _trimmed(base.get("id"))
    for key in _EDITABLE_SCALARS:
        if key in record:
            out[key] = record[key]
    out["display_id"] = _trimmed(out.get("display_id"))
    out["name"] = _trimmed(out.get("name"))
    out["category"] = _trimmed(out.get("category")) or "cute"
    out["enabled"] = out.get("enabled") is not False
    out["archived"] = out.get("archived") is True

    incoming_icon = record.get("icon") if isinstance(record.get("icon"), dict) else None
    base_icon = base.get("icon") if isinstance(base.get("icon"), dict) else {}
    icon = {**base_icon, **(incoming_icon or {})}
    glyph = _trimmed(icon.get("value")) or "default"
    out["icon"] = {"kind": "glyph", "value": glyph, "label": _trimmed(icon.get("label")) or out["name"]}

    incoming_message = record.get("message") if isinstance(record.get("message"), dict) else None
    base_message = base.get("message") if isinstance(base.get("message"), dict) else {}
    message = {**base_message, **(incoming_message or {})}
    short_text = _trimmed(message.get("short_text"))
    variants = message.get("variants")
    out["message"] = {
        "short_text": short_text,
        "variants": [v for v in variants if _trimmed(v)] if isinstance(variants, list) else [short_text],
    }
    if not out["message"]["variants"]:
        out["message"]["variants"] = [short_text]

    incoming_rooms = record.get("rooms") if isinstance(record.get("rooms"), dict) else None
    base_rooms = base.get("rooms") if isinstance(base.get("rooms"), dict) else {}

    hail_id = _trimmed(out.get("id")) or "hail.pending.000"
    incoming_dp = record.get("delivery_policy") if isinstance(record.get("delivery_policy"), dict) else None
    if incoming_dp and isinstance(incoming_dp.get("routes"), list):
        routes, route_errors = apply_delivery_policy_write(
            record,
            hail_id=hail_id,
            enabled=out.get("enabled") is not False,
            archived=out.get("archived") is True,
        )
        if route_errors:
            # Keep raw route rows so _validate_common can surface field-level errors.
            out["delivery_policy"] = {"routes": copy.deepcopy(incoming_dp["routes"])}
            routes = []
        else:
            out["delivery_policy"] = {"routes": routes}
    else:
        routes = routes_from_hail(out)
        out["delivery_policy"] = {"routes": routes}

    compat = rooms_compat_from_routes(routes if routes else [])
    out["rooms"] = {
        **compat,
        "badge_policy": _trimmed((incoming_rooms or base_rooms).get("badge_policy")) or "source_room",
    }

    for section, defaults in (
        ("visual", _DEFAULT_VISUAL),
        ("audio", _DEFAULT_AUDIO),
        ("behavior", _DEFAULT_BEHAVIOR),
        ("advanced", _DEFAULT_ADVANCED),
    ):
        incoming = record.get(section) if isinstance(record.get(section), dict) else None
        existing = base.get(section) if isinstance(base.get(section), dict) else None
        out[section] = {**defaults, **(existing or {}), **(incoming or {})}

    if isinstance(out.get("visual"), dict):
        eid = normalize_named_effect_id(out["visual"].get("effect_id"))
        out["visual"]["effect_id"] = eid
        contract = load_hail_render_contract_for_generation("v002-beta")
        prev_visual = previous.get("visual") if isinstance(previous, dict) and isinstance(previous.get("visual"), dict) else {}
        raw_variation = out["visual"].get("effect_variation_id")
        if raw_variation is None and prev_visual.get("effect_variation_id") is not None:
            raw_variation = prev_visual.get("effect_variation_id")
        variation_id = normalize_effect_variation_id(eid, raw_variation, contract)
        if variation_id:
            out["visual"]["effect_variation_id"] = variation_id
        elif "effect_variation_id" in out["visual"]:
            del out["visual"]["effect_variation_id"]
        tuning_entry = resolve_registry_tuning_entry(contract, eid, variation_id)
        if tuning_entry and effect_tuning_schema(tuning_entry):
            out["visual"]["effect_tuning"] = normalize_effect_tuning(
                eid,
                out["visual"].get("effect_tuning"),
                contract,
                variation_id=variation_id,
            )
        elif "effect_tuning" in out["visual"]:
            del out["visual"]["effect_tuning"]
        sidekick_id = normalize_message_sidekick_id(out["visual"].get("message_sidekick_id"), contract)
        out["visual"]["message_sidekick_id"] = sidekick_id
        message_entry = message_sidekick_entry(contract, sidekick_id)
        if message_entry and message_tuning_schema(message_entry):
            out["visual"]["message_tuning"] = normalize_message_tuning(
                sidekick_id,
                out["visual"].get("message_tuning"),
                contract,
            )
        elif "message_tuning" in out["visual"]:
            del out["visual"]["message_tuning"]
        palette_id = _trimmed(out["visual"].get("palette_id"))
        if palette_id in _DEPRECATED_PALETTE_ALIASES:
            out["visual"]["palette_id"] = _DEPRECATED_PALETTE_ALIASES[palette_id]
        out["visual"]["priority_level"] = normalize_priority_level(out["visual"].get("priority_level"))
        out["visual"]["effect_footprint_profile"] = resolve_effect_footprint_profile(
            out["visual"].get("effect_footprint_profile")
        )

    out = apply_priority_destination_bias(out)
    return out


def _finalize_hail_for_save(
    normalized: dict[str, Any],
    *,
    custom_glyphs: dict[str, dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """Beta v2 save gate — package must be consumer-deliverable."""
    if normalized.get("archived") is True:
        return ensure_hail_delivery_policy(normalized)

    from hails.hail_package_v2 import stamp_hail_package_metadata, validate_hail_record_for_save

    payload = build_consumer_render_payload(normalized, custom_glyphs=custom_glyphs)
    errors = validate_hail_record_for_save(normalized, payload)
    if errors:
        raise HailValidationError(errors)
    stamped = stamp_hail_package_metadata(normalized, payload)
    return ensure_hail_delivery_policy(stamped)


def create_hail(
    record: dict[str, Any],
    current_hails: list[dict[str, Any]],
    *,
    glyph_allowlist: tuple[str, ...] | None = None,
    custom_glyphs: dict[str, dict[str, Any]] | None = None,
) -> dict[str, Any]:
    existing_ids = {_trimmed(h.get("id")) for h in current_hails}
    working = dict(record)
    errors: list[dict[str, str]] = []
    _validate_incoming_boolean_scalars(working, errors)
    if errors:
        raise HailValidationError(errors)
    if not _trimmed(working.get("display_id")):
        working["display_id"] = next_display_id(current_hails)
    errors: list[dict[str, str]] = []
    _validate_incoming_effect_variation(working, errors)
    _validate_incoming_effect_tuning(working, errors)
    if errors:
        raise HailValidationError(errors)
    normalized = _normalized(working, previous=None)
    if not normalized["id"]:
        normalized["id"] = slugify_hail_id(normalized["name"] or "hail", existing_ids)

    errors: list[dict[str, str]] = []
    if normalized["id"] in existing_ids:
        errors.append({"path": "/id", "message": f"hail id already exists: {normalized['id']}"})
    elif not _HAIL_ID_RE.match(normalized["id"]):
        errors.append({"path": "/id", "message": "id must match hail.<slug>.<NNN>"})
    _validate_common(normalized, errors, glyph_allowlist=glyph_allowlist)
    if errors:
        raise HailValidationError(errors)
    return _finalize_hail_for_save(normalized, custom_glyphs=custom_glyphs)


def update_hail(
    hail_id: str,
    record: dict[str, Any],
    current_hails: list[dict[str, Any]],
    *,
    glyph_allowlist: tuple[str, ...] | None = None,
    custom_glyphs: dict[str, dict[str, Any]] | None = None,
) -> dict[str, Any]:
    previous = next((h for h in current_hails if _trimmed(h.get("id")) == hail_id), None)
    if previous is None:
        raise KeyError(hail_id)
    working = dict(record)
    working["id"] = hail_id  # id is immutable
    errors: list[dict[str, str]] = []
    _validate_incoming_boolean_scalars(working, errors)
    if errors:
        raise HailValidationError(errors)
    errors = []
    _validate_incoming_effect_variation(working, errors, previous=previous)
    _validate_incoming_effect_tuning(working, errors, previous=previous)
    if errors:
        raise HailValidationError(errors)
    normalized = _normalized(working, previous=previous)

    errors = []
    _validate_common(normalized, errors, glyph_allowlist=glyph_allowlist, previous=previous)
    if errors:
        raise HailValidationError(errors)
    return _finalize_hail_for_save(normalized, custom_glyphs=custom_glyphs)


def archive_hail(hail_id: str, current_hails: list[dict[str, Any]]) -> dict[str, Any]:
    previous = next((h for h in current_hails if _trimmed(h.get("id")) == hail_id), None)
    if previous is None:
        raise KeyError(hail_id)
    archived = copy.deepcopy(previous)
    archived["archived"] = True
    archived["enabled"] = False
    return ensure_hail_delivery_policy(archived)


def restore_hail(
    hail_id: str,
    current_hails: list[dict[str, Any]],
    *,
    glyph_allowlist: tuple[str, ...] | None = None,
) -> dict[str, Any]:
    return update_hail(
        hail_id,
        {"archived": False, "enabled": True},
        current_hails,
        glyph_allowlist=glyph_allowlist,
    )


def delete_hail(hail_id: str, current_hails: list[dict[str, Any]]) -> None:
    if not any(_trimmed(h.get("id")) == hail_id for h in current_hails):
        raise KeyError(hail_id)


def effective_lcard_hails(
    st: AxiomStoredSettings,
    *,
    public_base_url: str = "",
) -> list[dict[str, Any]] | None:
    """Domain projection for the LCARD effective payload.

    Returns None when the domain list is empty and never materialized so callers
    fall back to the legacy app_settings/seed merge path unchanged.
    When materialized, an empty list is intentional (operator cleared the catalog).
    Includes companion hails for active custom glyphs that lack an operator hail
    (Forge parity — LCARD send rack matches My Glyphs).
    """
    from hails.hails_composer import (
        companion_hails_for_orphan_glyphs,
        custom_glyphs_from_settings,
        effective_hail_glyph_allowlist,
    )

    custom_glyphs = custom_glyphs_from_settings(st)
    allowlist = effective_hail_glyph_allowlist(st)

    def _project(hails: list[dict[str, Any]]) -> list[dict[str, Any]]:
        active = [h for h in hails if h.get("archived") is not True]
        orphans = companion_hails_for_orphan_glyphs(active, custom_glyphs, glyph_allowlist=allowlist)
        merged = active + orphans
        return [
            enrich_hail_for_lcard_effective(
                h,
                custom_glyphs=custom_glyphs,
                public_base_url=public_base_url,
            )
            for h in merged
        ]

    if st.hails_catalog_materialized:
        return _project(list(st.hails))
    if not st.hails:
        return None
    return _project(list(st.hails))

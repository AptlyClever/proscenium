"""Canonical Hails delivery policy: explicit routes, validation, migration, LCARD projection."""

from __future__ import annotations

import copy
import re
from typing import Any

KNOWN_ROOM_IDS: tuple[str, ...] = ("arcade", "master_bedroom", "away_team")
KNOWN_PROVIDERS: tuple[str, ...] = ("lcard",)

_ROUTE_ID_RE = re.compile(r"^route\.[a-z0-9_]+\.[a-z0-9_]+\.[a-z0-9_]+$")


def _trimmed(value: Any) -> str:
    return value.strip() if isinstance(value, str) else ""


def _known_room(room_id: Any) -> str | None:
    room = _trimmed(room_id)
    return room if room in KNOWN_ROOM_IDS else None


def stable_route_id(launch_room_id: str, destination_room_id: str, suffix: str = "001") -> str:
    return f"route.{launch_room_id}.{destination_room_id}.{suffix}"


def _route_id_suffix(route_id: str) -> str:
    submitted = _trimmed(route_id)
    if submitted and _ROUTE_ID_RE.match(submitted):
        return submitted.rsplit(".", 1)[-1]
    return "001"


def normalize_route_id_for_endpoints(launch: str, destination: str, submitted_id: Any) -> str:
    """Return a route id whose launch/destination segments match the given endpoints."""
    suffix = _route_id_suffix(submitted_id if isinstance(submitted_id, str) else "")
    normalized = stable_route_id(launch, destination, suffix)
    submitted = _trimmed(submitted_id)
    if submitted == normalized:
        return submitted
    expected_prefix = f"route.{launch}.{destination}."
    if submitted.startswith(expected_prefix) and _ROUTE_ID_RE.match(submitted):
        return submitted
    return normalized


def _coerce_bool(value: Any, default: bool = False) -> bool:
    if isinstance(value, bool):
        return value
    return default


def normalize_route_row(raw: dict[str, Any], *, hail_id: str, index: int) -> dict[str, Any]:
    launch = _known_room(raw.get("launch_room_id"))
    destination = _known_room(raw.get("destination_room_id"))
    if not launch or not destination:
        raise ValueError(f"route[{index}] requires known launch_room_id and destination_room_id")
    route_id = normalize_route_id_for_endpoints(launch, destination, raw.get("id"))
    provider = _trimmed(raw.get("provider")) or "lcard"
    return {
        "id": route_id,
        "launch_room_id": launch,
        "destination_room_id": destination,
        "provider": provider,
        "requires_confirmation": _coerce_bool(raw.get("requires_confirmation")),
        "enabled": _coerce_bool(raw.get("enabled"), default=True),
    }


def routes_from_hail(hail: dict[str, Any]) -> list[dict[str, Any]]:
    """Return explicit delivery_policy.routes only — no legacy list derivation."""
    delivery = hail.get("delivery_policy") if isinstance(hail.get("delivery_policy"), dict) else {}
    routes = delivery.get("routes")
    if isinstance(routes, list) and routes:
        hail_id = _trimmed(hail.get("id")) or "hail.unknown.000"
        return [normalize_route_row(r, hail_id=hail_id, index=i) for i, r in enumerate(routes) if isinstance(r, dict)]
    return []


def rooms_compat_from_routes(routes: list[dict[str, Any]]) -> dict[str, Any]:
    """Compatibility-only rooms projection derived from explicit routes (not canonical policy)."""
    enabled = [r for r in routes if r.get("enabled") is not False]
    sources: list[str] = []
    targets: list[str] = []
    seen_s: set[str] = set()
    seen_t: set[str] = set()
    for route in enabled:
        launch = route["launch_room_id"]
        dest = route["destination_room_id"]
        if launch not in seen_s:
            seen_s.add(launch)
            sources.append(launch)
        if dest not in seen_t:
            seen_t.add(dest)
            targets.append(dest)
    return {
        "allowed_source_room_ids": sources,
        "allowed_target_room_ids": targets,
    }


def enrich_effective_by_launch_room(routes: list[dict[str, Any]]) -> dict[str, Any]:
    enabled = [r for r in routes if r.get("enabled") is not False]
    by_launch: dict[str, list[dict[str, Any]]] = {}
    for route in enabled:
        by_launch.setdefault(route["launch_room_id"], []).append(route)

    effective: dict[str, Any] = {}
    for launch_room_id, launch_routes in by_launch.items():
        entry: dict[str, Any] = {
            "routes": [
                {
                    "route_id": route["id"],
                    "destination_room_id": route["destination_room_id"],
                    "provider": route["provider"],
                    "requires_confirmation": route["requires_confirmation"],
                    "enabled": route["enabled"],
                }
                for route in launch_routes
            ]
        }
        if len(launch_routes) == 1:
            dest = launch_routes[0]["destination_room_id"]
            entry["configured_target"] = {
                "id": dest,
                "route_id": launch_routes[0]["id"],
            }
        else:
            entry["configured_target"] = None
        effective[launch_room_id] = entry
    return effective


def validate_delivery_routes(
    routes: list[dict[str, Any]],
    *,
    enabled: bool,
    archived: bool,
) -> list[dict[str, str]]:
    errors: list[dict[str, str]] = []
    if not isinstance(routes, list):
        errors.append({"path": "/delivery_policy/routes", "message": "routes must be an array"})
        return errors

    enabled_pairs: set[str] = set()
    for index, raw in enumerate(routes):
        prefix = f"/delivery_policy/routes/{index}"
        if not isinstance(raw, dict):
            errors.append({"path": prefix, "message": "route must be an object"})
            continue

        launch = _known_room(raw.get("launch_room_id"))
        if not launch:
            errors.append({"path": f"{prefix}/launch_room_id", "message": "unknown or missing launch room"})
            continue
        destination = _known_room(raw.get("destination_room_id"))
        if not destination:
            errors.append({"path": f"{prefix}/destination_room_id", "message": "unknown or missing destination room"})
            continue

        provider = _trimmed(raw.get("provider")) or "lcard"
        if provider not in KNOWN_PROVIDERS:
            errors.append({"path": f"{prefix}/provider", "message": f"unsupported provider: {provider}"})

        route_id = _trimmed(raw.get("id"))
        if route_id and not _ROUTE_ID_RE.match(route_id):
            errors.append({"path": f"{prefix}/id", "message": "route id must match route.<launch>.<dest>.<suffix>"})

        if raw.get("enabled") is False:
            continue

        pair_key = f"{launch}:{destination}"
        if pair_key in enabled_pairs:
            errors.append(
                {
                    "path": prefix,
                    "message": f"duplicate enabled route: {launch} → {destination}",
                }
            )
        enabled_pairs.add(pair_key)

    active_count = sum(1 for r in routes if isinstance(r, dict) and r.get("enabled") is not False)
    if enabled and not archived and active_count == 0:
        errors.append(
            {
                "path": "/delivery_policy/routes",
                "message": "enabled non-archived Hail requires at least one enabled route",
            }
        )

    return errors


def reject_list_only_policy_write(record: dict[str, Any], errors: list[dict[str, str]]) -> None:
    delivery = record.get("delivery_policy") if isinstance(record.get("delivery_policy"), dict) else {}
    has_routes = isinstance(delivery.get("routes"), list)
    rooms = record.get("rooms") if isinstance(record.get("rooms"), dict) else {}
    has_legacy_lists = bool(rooms.get("allowed_source_room_ids") or rooms.get("allowed_target_room_ids"))

    if has_legacy_lists and not has_routes:
        errors.append(
            {
                "path": "/delivery_policy/routes",
                "message": "explicit delivery_policy.routes required; list-only rooms policy writes are not accepted",
            }
        )


def ensure_hail_delivery_policy(hail: dict[str, Any]) -> dict[str, Any]:
    """Normalize read output: canonical routes + compatibility rooms projection."""
    out = copy.deepcopy(hail)
    routes = routes_from_hail(out)
    out["delivery_policy"] = {
        "routes": routes,
        "effective_by_launch_room": enrich_effective_by_launch_room(routes),
    }
    base_rooms = out.get("rooms") if isinstance(out.get("rooms"), dict) else {}
    compat = rooms_compat_from_routes(routes)
    out["rooms"] = {
        **compat,
        "badge_policy": _trimmed(base_rooms.get("badge_policy")) or "source_room",
        "_compat_note": "rooms lists are derived from delivery_policy.routes for legacy consumers only",
    }
    return out


def apply_delivery_policy_write(
    record: dict[str, Any],
    *,
    hail_id: str,
    enabled: bool,
    archived: bool,
) -> tuple[list[dict[str, Any]], list[dict[str, str]]]:
    """Parse incoming delivery_policy.routes for create/update."""
    delivery = record.get("delivery_policy") if isinstance(record.get("delivery_policy"), dict) else {}
    raw_routes = delivery.get("routes")
    if not isinstance(raw_routes, list):
        return [], [{"path": "/delivery_policy/routes", "message": "delivery_policy.routes is required"}]

    normalized: list[dict[str, Any]] = []
    parse_errors: list[dict[str, str]] = []
    for index, raw in enumerate(raw_routes):
        prefix = f"/delivery_policy/routes/{index}"
        if not isinstance(raw, dict):
            parse_errors.append({"path": prefix, "message": "route must be an object"})
            continue
        try:
            normalized.append(normalize_route_row(raw, hail_id=hail_id, index=index))
        except ValueError as exc:
            launch = _known_room(raw.get("launch_room_id"))
            destination = _known_room(raw.get("destination_room_id"))
            if not launch:
                parse_errors.append({"path": f"{prefix}/launch_room_id", "message": "unknown or missing launch room"})
            elif not destination:
                parse_errors.append({"path": f"{prefix}/destination_room_id", "message": "unknown or missing destination room"})
            else:
                parse_errors.append({"path": prefix, "message": str(exc)})

    if parse_errors:
        return [], parse_errors

    validation_errors = validate_delivery_routes(normalized, enabled=enabled, archived=archived)
    return normalized, validation_errors


def enrich_hail_for_lcard_effective(
    hail: dict[str, Any],
    *,
    custom_glyphs: dict[str, dict[str, Any]] | None = None,
    public_base_url: str = "",
) -> dict[str, Any]:
    """Project domain hail for LCARD effective payload using explicit routes only."""
    from hails.hail_lcard_catalog import project_lcard_catalog_fields
    from hails.hails_glyph_render import resolve_glyph_render

    out = ensure_hail_delivery_policy(hail)
    icon = out.get("icon") if isinstance(out.get("icon"), dict) else {}
    glyph_id = _trimmed(icon.get("value"))
    if glyph_id:
        out["glyph_render"] = resolve_glyph_render(glyph_id, custom_glyphs=custom_glyphs)
    hail_package = hail.get("hail_package")
    if isinstance(hail_package, dict):
        out["hail_package"] = copy.deepcopy(hail_package)
        out["catalog_ready"] = hail_package.get("catalog_ready") is True
        schema_version = hail_package.get("package_schema_version")
        if schema_version is not None:
            out["package_schema_version"] = schema_version
    out.update(project_lcard_catalog_fields(out, public_base_url=public_base_url))
    return out

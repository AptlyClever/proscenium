"""Axiom glyph registry — storage and projection for fleet glyph metadata.

Canonical artifact: ``config/hails/glyph-registry.v001.json``

Authority: Axiom CRUD decides which glyphs exist; the registry stores what Axiom
instructs. See ``docs/hails/hails-authority-v001.md``. Bundled JSON must not act
as fleet SoT — implementation is migrating toward settings-backed catalogs.
"""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

REGISTRY_VERSION = "v001"
REGISTRY_REL_PATH = Path("config") / "hails" / "glyph-registry.v001.json"
VALID_STATUSES: tuple[str, ...] = ("approved", "draft", "deprecated", "future")
DEFAULT_SELECTABLE_STATUSES: tuple[str, ...] = ("approved", "draft")


def _repo_root() -> Path:
    module_dir = Path(__file__).resolve().parent
    # Package lives in backend/hails; walk up to find config/ (repo root in dev,
    # /app in Docker where backend is copied flat).
    for candidate in (module_dir, *module_dir.parents):
        if (candidate / "config" / "hails").is_dir():
            return candidate
    return module_dir.parents[1]


def registry_path() -> Path:
    return _repo_root() / REGISTRY_REL_PATH


@lru_cache(maxsize=1)
def load_glyph_registry() -> dict[str, Any]:
    path = registry_path()
    with path.open(encoding="utf-8") as fh:
        return json.load(fh)


def reload_glyph_registry() -> dict[str, Any]:
    load_glyph_registry.cache_clear()
    return load_glyph_registry()


def _selectable_statuses(doc: dict[str, Any]) -> tuple[str, ...]:
    raw = doc.get("selectableStatuses") or list(DEFAULT_SELECTABLE_STATUSES)
    return tuple(str(s) for s in raw)


def registry_entries(doc: dict[str, Any] | None = None) -> list[dict[str, Any]]:
    document = doc or load_glyph_registry()
    glyphs = document.get("glyphs")
    if not isinstance(glyphs, list):
        return []
    return [g for g in glyphs if isinstance(g, dict) and (g.get("glyph_id") or "").strip()]


def registry_entry(glyph_id: str, doc: dict[str, Any] | None = None) -> dict[str, Any] | None:
    needle = (glyph_id or "").strip()
    if not needle:
        return None
    return next((g for g in registry_entries(doc) if g.get("glyph_id") == needle), None)


def hail_glyph_allowlist(doc: dict[str, Any] | None = None) -> tuple[str, ...]:
    """Glyph ids selectable in compose / Forge pickers (approved + draft in selectableStatuses)."""
    document = doc or load_glyph_registry()
    selectable = set(_selectable_statuses(document))
    ids = [g["glyph_id"] for g in registry_entries(document) if g.get("status") in selectable]
    return tuple(sorted(set(ids)))


def registry_delivery_glyph_ids(doc: dict[str, Any] | None = None) -> tuple[str, ...]:
    """Registry ids valid on saved hails and consumer render payloads (includes deprecated legacy marks)."""
    document = doc or load_glyph_registry()
    deliverable = {"approved", "draft", "deprecated"}
    ids = [g["glyph_id"] for g in registry_entries(document) if g.get("status") in deliverable]
    return tuple(sorted(set(ids)))


def registry_selector_entries(doc: dict[str, Any] | None = None) -> list[dict[str, Any]]:
    """Frontend-safe metadata for glyph selectors."""
    document = doc or load_glyph_registry()
    allowlist = set(hail_glyph_allowlist(document))
    out: list[dict[str, Any]] = []
    for entry in registry_entries(document):
        glyph_id = entry.get("glyph_id")
        if glyph_id not in allowlist:
            continue
        out.append(
            {
                "glyph_id": glyph_id,
                "label": entry.get("label") or glyph_id,
                "status": entry.get("status") or "draft",
                "category": entry.get("category") or "hail",
                "fallback_emoji": entry.get("fallback_emoji") or entry.get("fallback_text") or "",
                "semantic_intent": entry.get("semantic_intent") or "",
                "description": entry.get("description") or "",
            }
        )
    return out


def validate_glyph_registry(doc: dict[str, Any] | None = None) -> list[str]:
    """Return validation errors; empty means OK."""
    document = doc or load_glyph_registry()
    errors: list[str] = []

    if document.get("ownership") != "axiom":
        errors.append("ownership must be axiom")

    seen: set[str] = set()
    for entry in registry_entries(document):
        glyph_id = entry.get("glyph_id")
        if not glyph_id:
            errors.append("glyph entry missing glyph_id")
            continue
        if glyph_id in seen:
            errors.append(f"duplicate glyph_id: {glyph_id}")
        seen.add(glyph_id)
        status = entry.get("status")
        if status not in VALID_STATUSES:
            errors.append(f"{glyph_id}: invalid status {status!r}")
        if not (entry.get("label") or "").strip():
            errors.append(f"{glyph_id}: label is required")
        surfaces = entry.get("surfaces")
        if not isinstance(surfaces, dict):
            errors.append(f"{glyph_id}: surfaces object required")

    return errors


def validate_glyph_id(glyph_id: str | None, doc: dict[str, Any] | None = None) -> bool:
    """True when glyph_id is operator-selectable in compose pickers."""
    return (glyph_id or "").strip() in hail_glyph_allowlist(doc)


def validate_delivery_glyph_id(glyph_id: str | None, doc: dict[str, Any] | None = None) -> bool:
    """True when glyph_id may appear on a saved hail or render payload."""
    return (glyph_id or "").strip() in registry_delivery_glyph_ids(doc)


def validate_registry_contract_alignment(
    contract: dict[str, Any] | None = None,
    doc: dict[str, Any] | None = None,
) -> list[str]:
    """Ensure render-contract glyph allowlist matches registry selectable set."""
    from hails.hails_render_contract import load_hail_render_contract

    contract_doc = contract or load_hail_render_contract()
    registry_allowlist = set(registry_delivery_glyph_ids(doc))
    contract_allowlist = set(contract_doc.get("glyphs", {}).get("allowlist") or [])
    errors: list[str] = []
    if registry_allowlist != contract_allowlist:
        missing_in_contract = sorted(registry_allowlist - contract_allowlist)
        missing_in_registry = sorted(contract_allowlist - registry_allowlist)
        if missing_in_contract:
            errors.append(f"contract allowlist missing registry glyphs: {missing_in_contract}")
        if missing_in_registry:
            errors.append(f"registry missing contract glyphs: {missing_in_registry}")
    return errors


def glyph_registry_summary(doc: dict[str, Any] | None = None) -> dict[str, Any]:
    document = doc or load_glyph_registry()
    entries = registry_entries(document)
    return {
        "version": document.get("version", REGISTRY_VERSION),
        "ownership": document.get("ownership"),
        "canonicalLocation": document.get("canonicalLocation"),
        "glyph_count": len(entries),
        "allowlist": list(hail_glyph_allowlist(document)),
        "delivery_allowlist": list(registry_delivery_glyph_ids(document)),
        "status_counts": {
            status: sum(1 for e in entries if e.get("status") == status) for status in VALID_STATUSES
        },
    }

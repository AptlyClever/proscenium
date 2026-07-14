"""Glyph Generation Workbench v001 — brief and candidate-slot metadata workflow.

Canonical seed: ``config/hails/glyph-generation-workbench.v001.json``
Runtime state: ``glyph_generation_workbench`` on axiom-settings.json

Does not generate images or store art assets.
"""

from __future__ import annotations

import copy
import json
from datetime import date
from functools import lru_cache
from pathlib import Path
from typing import Any

from hails.glyph_asset_staging import (
    ALLOWED_CANDIDATE_STATUSES,
    apply_candidate_update,
    empty_candidate_slot,
    validate_candidate_staging,
)
from hails.glyph_registry import REGISTRY_VERSION, load_glyph_registry, registry_entry

WORKBENCH_VERSION = "v001"
WORKBENCH_REL_PATH = Path("config") / "hails" / "glyph-generation-workbench.v001.json"

BRIEF_STATUSES: tuple[str, ...] = (
    "draft",
    "ready_for_generation",
    "generated",
    "reviewed",
    "rejected",
    "promoted",
    "archived",
)
CANDIDATE_STATUSES: tuple[str, ...] = ALLOWED_CANDIDATE_STATUSES
ACTIVE_BRIEF_STATUSES: tuple[str, ...] = tuple(s for s in BRIEF_STATUSES if s != "archived")


class WorkbenchValidationError(ValueError):
    def __init__(self, errors: list[dict[str, str]]):
        self.errors = errors
        super().__init__("; ".join(e["message"] for e in errors))


def _repo_root() -> Path:
    module_dir = Path(__file__).resolve().parent
    # Package lives in backend/hails; walk up to find config/ (repo root in dev,
    # /app in Docker where backend is copied flat).
    for candidate in (module_dir, *module_dir.parents):
        if (candidate / "config" / "hails").is_dir():
            return candidate
    return module_dir.parents[1]


def workbench_seed_path() -> Path:
    return _repo_root() / WORKBENCH_REL_PATH


@lru_cache(maxsize=1)
def load_workbench_seed() -> dict[str, Any]:
    path = workbench_seed_path()
    with path.open(encoding="utf-8") as fh:
        return json.load(fh)


def reload_workbench_seed() -> dict[str, Any]:
    load_workbench_seed.cache_clear()
    return load_workbench_seed()


def _trimmed(value: Any) -> str:
    return value.strip() if isinstance(value, str) else ""


def _target_surfaces_from_registry(entry: dict[str, Any]) -> list[str]:
    surfaces = entry.get("surfaces") if isinstance(entry.get("surfaces"), dict) else {}
    return sorted(k for k, enabled in surfaces.items() if enabled)


def brief_from_registry_glyph(glyph_id: str, *, brief_id: str | None = None) -> dict[str, Any]:
    entry = registry_entry(glyph_id)
    if entry is None:
        raise WorkbenchValidationError([{"path": "/glyph_id", "message": f"unknown glyph id: {glyph_id}"}])
    gid = entry["glyph_id"]
    return {
        "brief_id": brief_id or f"brief-{gid}-v001",
        "glyph_id": gid,
        "status": "draft",
        "created_at": date.today().isoformat(),
        "source_registry_version": load_glyph_registry().get("version", REGISTRY_VERSION),
        "registry_glyph_status": entry.get("status"),
        "generation_prompt": entry.get("generation_prompt") or "",
        "negative_prompt": "",
        "visual_constraints": copy.deepcopy(entry.get("visual_constraints") or {}),
        "target_surfaces": _target_surfaces_from_registry(entry),
        "candidate_slots": [
            empty_candidate_slot(f"candidate-{gid}-001"),
        ],
        "review_notes": entry.get("review_notes") or "",
        "promotion_target": None,
        "archived": False,
    }


def _find_candidate(brief: dict[str, Any], candidate_id: str) -> tuple[int, dict[str, Any]]:
    slots = brief.get("candidate_slots") or []
    for index, slot in enumerate(slots):
        if isinstance(slot, dict) and _trimmed(slot.get("candidate_id")) == candidate_id:
            return index, slot
    raise KeyError(candidate_id)


def _apply_candidate_slot(brief: dict[str, Any], candidate_id: str, body: dict[str, Any]) -> dict[str, Any]:
    index, previous = _find_candidate(brief, candidate_id)
    merged = apply_candidate_update(previous, body, candidate_id)
    errors = validate_candidate_staging(merged, index)
    if errors:
        raise WorkbenchValidationError(errors)
    out = copy.deepcopy(brief)
    slots = list(out.get("candidate_slots") or [])
    slots[index] = merged
    out["candidate_slots"] = slots
    errors = validate_brief(out)
    if errors:
        raise WorkbenchValidationError(errors)
    return out


def _find_brief_by_id(brief_id: str, current_briefs: list[dict[str, Any]]) -> dict[str, Any]:
    brief = next((b for b in current_briefs if _trimmed(b.get("brief_id")) == brief_id), None)
    if brief is None:
        raise KeyError(brief_id)
    return brief


def update_workbench_candidate(
    brief_id: str,
    candidate_id: str,
    body: dict[str, Any],
    current_briefs: list[dict[str, Any]],
) -> dict[str, Any]:
    brief = _find_brief_by_id(brief_id, current_briefs)
    try:
        return _apply_candidate_slot(brief, candidate_id, body)
    except KeyError:
        raise KeyError(candidate_id) from None


def clear_workbench_candidate(brief_id: str, candidate_id: str, current_briefs: list[dict[str, Any]]) -> dict[str, Any]:
    return update_workbench_candidate(
        brief_id,
        candidate_id,
        empty_candidate_slot(candidate_id),
        current_briefs,
    )


def accept_workbench_candidate(
    brief_id: str,
    candidate_id: str,
    current_briefs: list[dict[str, Any]],
    *,
    notes: str | None = None,
) -> dict[str, Any]:
    brief = _find_brief_by_id(brief_id, current_briefs)
    _, previous = _find_candidate(brief, candidate_id)
    patch: dict[str, Any] = {"status": "accepted"}
    if notes is not None:
        patch["notes"] = notes
    elif previous.get("notes"):
        patch["notes"] = previous.get("notes")
    return update_workbench_candidate(brief_id, candidate_id, patch, current_briefs)


def reject_workbench_candidate(
    brief_id: str,
    candidate_id: str,
    current_briefs: list[dict[str, Any]],
    *,
    notes: str | None = None,
) -> dict[str, Any]:
    brief = _find_brief_by_id(brief_id, current_briefs)
    _, previous = _find_candidate(brief, candidate_id)
    patch: dict[str, Any] = {"status": "rejected"}
    if notes is not None:
        patch["notes"] = notes
    elif previous.get("notes"):
        patch["notes"] = previous.get("notes")
    return update_workbench_candidate(brief_id, candidate_id, patch, current_briefs)


def _validate_candidate_slot(slot: dict[str, Any], index: int, errors: list[dict[str, str]]) -> None:
    errors.extend(validate_candidate_staging(slot, index))


def validate_brief(brief: dict[str, Any], *, existing_ids: set[str] | None = None) -> list[dict[str, str]]:
    errors: list[dict[str, str]] = []
    brief_id = _trimmed(brief.get("brief_id"))
    if not brief_id:
        errors.append({"path": "/brief_id", "message": "brief_id is required"})
    elif existing_ids is not None and brief_id in existing_ids:
        errors.append({"path": "/brief_id", "message": f"brief_id already exists: {brief_id}"})

    glyph_id = _trimmed(brief.get("glyph_id"))
    if not glyph_id:
        errors.append({"path": "/glyph_id", "message": "glyph_id is required"})
    elif registry_entry(glyph_id) is None:
        errors.append({"path": "/glyph_id", "message": f"unknown glyph id: {glyph_id}"})

    status = _trimmed(brief.get("status")) or "draft"
    if status not in BRIEF_STATUSES:
        errors.append({"path": "/status", "message": f"brief status must be one of: {', '.join(BRIEF_STATUSES)}"})

    slots = brief.get("candidate_slots")
    if not isinstance(slots, list) or not slots:
        errors.append({"path": "/candidate_slots", "message": "at least one candidate slot is required"})
    else:
        seen_candidates: set[str] = set()
        for index, slot in enumerate(slots):
            if not isinstance(slot, dict):
                errors.append({"path": f"/candidate_slots/{index}", "message": "candidate slot must be an object"})
                continue
            candidate_id = _trimmed(slot.get("candidate_id"))
            if not candidate_id:
                errors.append({"path": f"/candidate_slots/{index}/candidate_id", "message": "candidate_id is required"})
            elif candidate_id in seen_candidates:
                errors.append({"path": f"/candidate_slots/{index}/candidate_id", "message": "duplicate candidate_id"})
            else:
                seen_candidates.add(candidate_id)
            _validate_candidate_slot(slot, index, errors)

    return errors


def _normalize_brief(record: dict[str, Any], *, previous: dict[str, Any] | None = None) -> dict[str, Any]:
    base = copy.deepcopy(previous) if previous else {}
    out = {**base, **copy.deepcopy(record)}
    out["brief_id"] = _trimmed(out.get("brief_id"))
    out["glyph_id"] = _trimmed(out.get("glyph_id"))
    out["status"] = _trimmed(out.get("status")) or "draft"
    out["archived"] = out.get("archived") is True or out["status"] == "archived"
    if out["archived"]:
        out["status"] = "archived"
    if not out.get("created_at"):
        out["created_at"] = date.today().isoformat()
    if not isinstance(out.get("visual_constraints"), dict):
        out["visual_constraints"] = {}
    if not isinstance(out.get("target_surfaces"), list):
        out["target_surfaces"] = []
    slots = out.get("candidate_slots")
    if isinstance(slots, list):
        out["candidate_slots"] = copy.deepcopy(slots)
    return out


def resolve_workbench_briefs(stored: dict[str, Any] | None) -> tuple[list[dict[str, Any]], str]:
    """Return brief list and source label (domain | seed)."""
    if isinstance(stored, dict) and isinstance(stored.get("briefs"), list) and stored["briefs"]:
        return copy.deepcopy(stored["briefs"]), "domain"
    seed = load_workbench_seed()
    return copy.deepcopy(seed.get("briefs") or []), "seed"


def workbench_state_from_settings(settings_obj: Any) -> dict[str, Any]:
    raw = getattr(settings_obj, "glyph_generation_workbench", None)
    if isinstance(raw, dict):
        return raw
    return {}


def create_brief(body: dict[str, Any], current_briefs: list[dict[str, Any]]) -> dict[str, Any]:
    glyph_id = _trimmed(body.get("glyph_id"))
    if not glyph_id:
        raise WorkbenchValidationError([{"path": "/glyph_id", "message": "glyph_id is required"}])
    brief_id = _trimmed(body.get("brief_id"))
    seeded = brief_from_registry_glyph(glyph_id, brief_id=brief_id or None)
    merged = _normalize_brief({**seeded, **body}, previous=None)
    existing_ids = {_trimmed(b.get("brief_id")) for b in current_briefs}
    errors = validate_brief(merged, existing_ids=existing_ids)
    if errors:
        raise WorkbenchValidationError(errors)
    return merged


def update_brief(brief_id: str, body: dict[str, Any], current_briefs: list[dict[str, Any]]) -> dict[str, Any]:
    previous = next((b for b in current_briefs if _trimmed(b.get("brief_id")) == brief_id), None)
    if previous is None:
        raise KeyError(brief_id)
    working = dict(body)
    working["brief_id"] = brief_id
    normalized = _normalize_brief(working, previous=previous)
    errors = validate_brief(normalized)
    if errors:
        raise WorkbenchValidationError(errors)
    return normalized


def archive_brief(brief_id: str, current_briefs: list[dict[str, Any]]) -> dict[str, Any]:
    return update_brief(brief_id, {"archived": True, "status": "archived"}, current_briefs)


def workbench_summary(briefs: list[dict[str, Any]]) -> dict[str, Any]:
    active = [b for b in briefs if b.get("archived") is not True and b.get("status") != "archived"]
    return {
        "version": WORKBENCH_VERSION,
        "brief_count": len(briefs),
        "active_brief_count": len(active),
        "brief_status_counts": {status: sum(1 for b in briefs if b.get("status") == status) for status in BRIEF_STATUSES},
    }


def validate_workbench_seed() -> list[str]:
    errors: list[str] = []
    seed = load_workbench_seed()
    if seed.get("ownership") != "axiom":
        errors.append("ownership must be axiom")
    for brief in seed.get("briefs") or []:
        if not isinstance(brief, dict):
            errors.append("seed brief must be object")
            continue
        brief_errors = validate_brief(brief)
        errors.extend(f"seed {brief.get('brief_id')}: {e['message']}" for e in brief_errors)
    return errors

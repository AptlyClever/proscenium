"""Glyph asset staging v001 — staged candidate ref validation and slot helpers.

Lightweight staging shelf for workbench candidate slots. Does not create art
files or mutate production registry assets.
"""

from __future__ import annotations

import copy
import re
from datetime import date
from typing import Any

CANONICAL_CANDIDATE_STATUSES: tuple[str, ...] = ("empty", "staged", "accepted", "rejected")
LEGACY_CANDIDATE_STATUSES: tuple[str, ...] = ("generated", "reviewed", "promoted")
ALLOWED_CANDIDATE_STATUSES: tuple[str, ...] = CANONICAL_CANDIDATE_STATUSES + LEGACY_CANDIDATE_STATUSES

ASSET_KINDS: tuple[str, ...] = ("svg", "png", "webp")
ASSET_SOURCES: tuple[str, ...] = ("manual_import", "external_generation", "unknown")
STAGED_ASSET_PREFIX = "staged/glyphs/"

_URL_RE = re.compile(r"^[a-zA-Z][a-zA-Z0-9+.-]*://")


def _trimmed(value: Any) -> str:
    return value.strip() if isinstance(value, str) else ""


def status_allows_asset_ref(status: str) -> bool:
    return status in {"staged", "accepted", "rejected", "generated", "reviewed", "promoted"}


def validate_staged_asset_ref(asset_ref: str | None) -> list[dict[str, str]]:
    errors: list[dict[str, str]] = []
    ref = _trimmed(asset_ref)
    if not ref:
        return errors
    if ref.startswith("/") or ref.startswith("\\") or "://" in ref or _URL_RE.match(ref):
        errors.append({"path": "/asset_ref", "message": "asset_ref must be a relative staged path, not a URL or absolute path"})
    elif ".." in ref.split("/"):
        errors.append({"path": "/asset_ref", "message": "asset_ref must not contain parent path segments"})
    elif not ref.startswith(STAGED_ASSET_PREFIX):
        errors.append({"path": "/asset_ref", "message": f"asset_ref must start with {STAGED_ASSET_PREFIX}"})
    return errors


def empty_candidate_slot(candidate_id: str) -> dict[str, Any]:
    return {
        "candidate_id": candidate_id,
        "status": "empty",
        "asset_ref": None,
        "asset_kind": None,
        "source": None,
        "created_at": None,
        "notes": "",
        "preview_only": True,
    }


def normalize_candidate_slot(slot: dict[str, Any], *, previous: dict[str, Any] | None = None) -> dict[str, Any]:
    base = copy.deepcopy(previous) if previous else {}
    out = {**base, **copy.deepcopy(slot)}
    out["candidate_id"] = _trimmed(out.get("candidate_id"))
    status = _trimmed(out.get("status")) or "empty"
    out["status"] = status

    if status == "empty":
        cleared = empty_candidate_slot(out["candidate_id"])
        cleared["notes"] = out.get("notes") or ""
        return cleared

    asset_ref = out.get("asset_ref")
    if asset_ref is not None:
        out["asset_ref"] = _trimmed(asset_ref) or None

    asset_kind = _trimmed(out.get("asset_kind"))
    out["asset_kind"] = asset_kind or None
    source = _trimmed(out.get("source"))
    out["source"] = source or None
    if not out.get("created_at"):
        out["created_at"] = date.today().isoformat()
    out["preview_only"] = out.get("preview_only") is not False
    out["notes"] = out.get("notes") or ""
    return out


def validate_candidate_staging(slot: dict[str, Any], index: int) -> list[dict[str, str]]:
    errors: list[dict[str, str]] = []
    prefix = f"/candidate_slots/{index}"
    status = _trimmed(slot.get("status")) or "empty"
    if status not in ALLOWED_CANDIDATE_STATUSES:
        errors.append(
            {
                "path": f"{prefix}/status",
                "message": f"candidate status must be one of: {', '.join(ALLOWED_CANDIDATE_STATUSES)}",
            }
        )
        return errors

    asset_ref = slot.get("asset_ref")
    ref_text = _trimmed(asset_ref) if asset_ref is not None else ""

    if status == "empty":
        if ref_text:
            errors.append({"path": f"{prefix}/asset_ref", "message": "asset_ref must be null when status is empty"})
        if _trimmed(slot.get("asset_kind")):
            errors.append({"path": f"{prefix}/asset_kind", "message": "asset_kind must be null when status is empty"})
        if _trimmed(slot.get("source")):
            errors.append({"path": f"{prefix}/source", "message": "source must be null when status is empty"})
        return errors

    if not status_allows_asset_ref(status):
        if ref_text:
            errors.append({"path": f"{prefix}/asset_ref", "message": f"asset_ref not allowed for status {status}"})
        return errors

    if not ref_text:
        errors.append({"path": f"{prefix}/asset_ref", "message": "asset_ref is required when status is staged, accepted, or rejected"})
    else:
        for err in validate_staged_asset_ref(ref_text):
            errors.append({"path": f"{prefix}{err['path']}", "message": err["message"]})

    asset_kind = _trimmed(slot.get("asset_kind"))
    if not asset_kind:
        errors.append({"path": f"{prefix}/asset_kind", "message": "asset_kind is required when a staged asset_ref is set"})
    elif asset_kind not in ASSET_KINDS:
        errors.append({"path": f"{prefix}/asset_kind", "message": f"asset_kind must be one of: {', '.join(ASSET_KINDS)}"})

    source = _trimmed(slot.get("source"))
    if source and source not in ASSET_SOURCES:
        errors.append({"path": f"{prefix}/source", "message": f"source must be one of: {', '.join(ASSET_SOURCES)}"})

    return errors


def apply_candidate_update(previous: dict[str, Any], body: dict[str, Any], candidate_id: str) -> dict[str, Any]:
    return normalize_candidate_slot({**previous, **body, "candidate_id": candidate_id}, previous=previous)


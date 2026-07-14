"""Operator promotion of accepted workbench candidates to staged runtime bindings.

Records promotion metadata in settings (`glyph_staged_promotions`). Does not
mutate committed registry JSON or production Android/LCARD assets.
"""

from __future__ import annotations

import copy
from datetime import date
from typing import Any

from hails.glyph_asset_staging import validate_staged_asset_ref
from hails.glyph_generation_workbench import WorkbenchValidationError, _find_brief_by_id, _find_candidate, update_brief


class PromotionValidationError(WorkbenchValidationError):
    pass


def _trimmed(value: Any) -> str:
    return value.strip() if isinstance(value, str) else ""


def _preview_url(asset_ref: str) -> str:
    ref = _trimmed(asset_ref)
    if not ref:
        return ""
    return f"/{ref.lstrip('/')}"


def build_promotion_record(
    *,
    brief: dict[str, Any],
    candidate_id: str,
    candidate: dict[str, Any],
) -> dict[str, Any]:
    asset_ref = _trimmed(candidate.get("asset_ref"))
    return {
        "glyph_id": _trimmed(brief.get("glyph_id")),
        "brief_id": _trimmed(brief.get("brief_id")),
        "candidate_id": candidate_id,
        "asset_ref": asset_ref,
        "asset_kind": _trimmed(candidate.get("asset_kind")) or None,
        "source": _trimmed(candidate.get("source")) or None,
        "promoted_at": date.today().isoformat(),
        "preview_url": _preview_url(asset_ref),
        "notes": _trimmed(candidate.get("notes")) or None,
    }


def validate_promotion_candidate(candidate: dict[str, Any]) -> list[dict[str, str]]:
    errors: list[dict[str, str]] = []
    status = _trimmed(candidate.get("status"))
    if status != "accepted":
        errors.append({"path": "/status", "message": "candidate must be accepted before promotion"})
    asset_ref = _trimmed(candidate.get("asset_ref"))
    if not asset_ref:
        errors.append({"path": "/asset_ref", "message": "accepted candidate must have a staged asset_ref"})
    else:
        errors.extend(validate_staged_asset_ref(asset_ref))
    return errors


def promote_workbench_candidate(
    brief_id: str,
    candidate_id: str,
    current_briefs: list[dict[str, Any]],
) -> tuple[dict[str, Any], dict[str, Any]]:
    brief = _find_brief_by_id(brief_id, current_briefs)
    _, candidate = _find_candidate(brief, candidate_id)
    errors = validate_promotion_candidate(candidate)
    if errors:
        raise PromotionValidationError(errors)

    promotion = build_promotion_record(brief=brief, candidate_id=candidate_id, candidate=candidate)
    updated = update_brief(
        brief_id,
        {
            "status": "promoted",
            "promotion_target": copy.deepcopy(promotion),
            "review_notes": (
                f"{_trimmed(brief.get('review_notes'))}\nPromoted {promotion['promoted_at']}: {promotion['asset_ref']}"
            ).strip(),
        },
        current_briefs,
    )
    return updated, promotion


def glyph_staged_promotions_from_settings(settings_obj: Any) -> dict[str, dict[str, Any]]:
    raw = getattr(settings_obj, "glyph_staged_promotions", None)
    if not isinstance(raw, dict):
        return {}
    out: dict[str, dict[str, Any]] = {}
    for glyph_id, record in raw.items():
        if isinstance(record, dict) and _trimmed(glyph_id):
            out[_trimmed(glyph_id)] = copy.deepcopy(record)
    return out


def apply_glyph_staged_promotion(
    promotions: dict[str, dict[str, Any]],
    promotion: dict[str, Any],
) -> dict[str, dict[str, Any]]:
    glyph_id = _trimmed(promotion.get("glyph_id"))
    if not glyph_id:
        raise PromotionValidationError([{"path": "/glyph_id", "message": "promotion requires glyph_id"}])
    next_promotions = copy.deepcopy(promotions)
    next_promotions[glyph_id] = copy.deepcopy(promotion)
    return next_promotions

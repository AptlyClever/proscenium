"""Presentation template registry — fixed stage shells for raster Glyph Hero delivery."""

from __future__ import annotations

import base64
import json
from pathlib import Path
from typing import Any, Final

from settings import _resolve_repo_root

_TEMPLATE_DIR: Final[Path] = _resolve_repo_root() / "config/hails/presentation-templates"
_HAILS_CONFIG_DIR: Final[Path] = _resolve_repo_root() / "config/hails"
_DEFAULT_TEMPLATE_ID: Final[str] = "stage-medallion-v1"
_CHOREography_ANCHOR_KEYS: Final[frozenset[str]] = frozenset(
    {
        "glyphResolveStart",
        "glyphImpactPeak",
        "glyphLockIn",
        "messageRevealStart",
    }
)
_EFFECTS_SKIP_TEMPLATE_CHOREOGRAPHY: Final[frozenset[str]] = frozenset({"pop", "none"})
_STAGE_ASSET_SUFFIXES: Final[frozenset[str]] = frozenset({".png", ".webp"})


class PresentationTemplateError(ValueError):
    pass


def presentation_templates_dir() -> Path:
    return _TEMPLATE_DIR


def list_presentation_template_ids() -> list[str]:
    if not _TEMPLATE_DIR.is_dir():
        return []
    return sorted(path.name.replace(".template.json", "") for path in _TEMPLATE_DIR.glob("*.template.json"))


def load_presentation_template(template_id: str) -> dict[str, Any]:
    needle = (template_id or "").strip()
    if not needle:
        raise PresentationTemplateError("presentation_template_id is required")
    path = _TEMPLATE_DIR / f"{needle}.template.json"
    if not path.is_file():
        raise PresentationTemplateError(f"unknown presentation template: {needle}")
    raw = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(raw, dict):
        raise PresentationTemplateError(f"template must be object: {needle}")
    if str(raw.get("template_id") or "").strip() != needle:
        raise PresentationTemplateError(f"template_id mismatch in {path.name}")
    return raw


def resolve_presentation_template_id(hail_record: dict[str, Any]) -> str:
    visual = hail_record.get("visual") if isinstance(hail_record.get("visual"), dict) else {}
    override = visual.get("presentation_template_id")
    if isinstance(override, str) and override.strip():
        return override.strip()
    return _DEFAULT_TEMPLATE_ID


def _asset_url(relative_path: str) -> str:
    cleaned = relative_path.strip().lstrip("/")
    return f"/api/hails/presentation-assets/{cleaned}"


def _media_type_for_path(path: Path) -> str:
    suffix = path.suffix.lower()
    if suffix == ".webp":
        return "image/webp"
    return "image/png"


def _resolve_stage_asset_path(relative_path: str) -> Path:
    cleaned = relative_path.strip().lstrip("/")
    if not cleaned or ".." in cleaned.split("/"):
        raise PresentationTemplateError(f"unsafe stage asset path: {relative_path!r}")
    if not cleaned.lower().endswith(tuple(_STAGE_ASSET_SUFFIXES)):
        raise PresentationTemplateError(f"stage asset must be png/webp: {relative_path!r}")
    resolved = (_HAILS_CONFIG_DIR / cleaned).resolve()
    try:
        resolved.relative_to(_HAILS_CONFIG_DIR.resolve())
    except ValueError as exc:
        raise PresentationTemplateError(f"stage asset outside config/hails: {relative_path!r}") from exc
    return resolved


def build_presentation_template_for_delivery(
    presentation_template: dict[str, Any] | None,
) -> dict[str, Any] | None:
    """Inline stage PNGs for Google TV overlay POST — no runtime fetch to Axiom."""
    if not isinstance(presentation_template, dict):
        return None
    template_id = str(presentation_template.get("template_id") or "").strip()
    if not template_id:
        return None
    try:
        template_doc = load_presentation_template(template_id)
    except PresentationTemplateError:
        return None
    stage_assets_raw = template_doc.get("stage_assets") if isinstance(template_doc.get("stage_assets"), dict) else {}
    stage_assets: dict[str, Any] = {}
    for key, rel_path in stage_assets_raw.items():
        if not isinstance(rel_path, str) or not rel_path.strip():
            continue
        try:
            asset_path = _resolve_stage_asset_path(rel_path)
        except PresentationTemplateError:
            continue
        if not asset_path.is_file():
            continue
        stage_assets[str(key)] = {
            "path": rel_path.strip(),
            "image_base64": base64.b64encode(asset_path.read_bytes()).decode("ascii"),
            "image_media_type": _media_type_for_path(asset_path),
        }
    if not stage_assets:
        return None
    out = dict(presentation_template)
    out["stage_assets"] = stage_assets
    out.pop("stage_asset_urls", None)
    return out


def merge_effect_identity_with_template_choreography(
    effect_identity: dict[str, Any] | None,
    presentation_template: dict[str, Any] | None,
    *,
    effect_id: str | None = None,
) -> dict[str, Any] | None:
    """Template anchors override effect defaults for TV timing (P1-3/P1-4)."""
    if not isinstance(presentation_template, dict):
        return effect_identity if isinstance(effect_identity, dict) else None
    normalized_effect = str(effect_id or "").strip().lower()
    if normalized_effect in _EFFECTS_SKIP_TEMPLATE_CHOREOGRAPHY:
        return effect_identity if isinstance(effect_identity, dict) else None
    anchors_raw = presentation_template.get("choreography_anchors")
    if not isinstance(anchors_raw, dict) or not anchors_raw:
        return effect_identity if isinstance(effect_identity, dict) else None
    out = dict(effect_identity) if isinstance(effect_identity, dict) else {}
    existing = out.get("choreography_anchors") if isinstance(out.get("choreography_anchors"), dict) else {}
    merged = dict(existing)
    for key, value in anchors_raw.items():
        if str(key) in _CHOREography_ANCHOR_KEYS and isinstance(value, (int, float)):
            merged[str(key)] = float(value)
    out["choreography_anchors"] = merged
    return out


def build_presentation_template_entity(
    hail_record: dict[str, Any],
) -> dict[str, Any] | None:
    template_id = resolve_presentation_template_id(hail_record)
    try:
        template = load_presentation_template(template_id)
    except PresentationTemplateError:
        return None
    stage_assets = template.get("stage_assets") if isinstance(template.get("stage_assets"), dict) else {}
    stage_urls: dict[str, str] = {}
    for key, value in stage_assets.items():
        if isinstance(value, str) and value.strip():
            stage_urls[str(key)] = _asset_url(value)
    glyph_motion = template.get("glyph_motion") if isinstance(template.get("glyph_motion"), dict) else {}
    anchors_raw = template.get("choreography_anchors") if isinstance(template.get("choreography_anchors"), dict) else {}
    anchors = {
        str(key): float(value)
        for key, value in anchors_raw.items()
        if str(key) in _CHOREography_ANCHOR_KEYS and isinstance(value, (int, float))
    }
    overlay = template.get("presentation_overlay") if isinstance(template.get("presentation_overlay"), dict) else None
    overlay_entity = None
    if overlay:
        from hails.hail_presentation_overlay import build_presentation_overlay_entity

        overlay_entity = build_presentation_overlay_entity(overlay)
    return {
        "template_id": template_id,
        "label": str(template.get("label") or template_id),
        "stage_asset_urls": stage_urls,
        "glyph_motion": {
            "profile": str(glyph_motion.get("profile") or "default"),
            "resolve_style": str(glyph_motion.get("resolve_style") or "center_snap"),
        },
        "choreography_anchors": anchors,
        "presentation_overlay": overlay_entity,
    }

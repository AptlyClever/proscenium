"""Presentation overlay assets — Lottie slot (web-first; APK deferred)."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Final

from settings import _resolve_repo_root

_OVERLAY_DIR: Final[Path] = _resolve_repo_root() / "config/hails/presentation-overlays"
_ALLOWED_KINDS: Final[frozenset[str]] = frozenset({"lottie", "css_burst"})
_ALLOWED_ANCHORS: Final[frozenset[str]] = frozenset({"effect_field", "glyph_focus"})
_ALLOWED_START_ANCHORS: Final[frozenset[str]] = frozenset(
    {
        "glyphResolveStart",
        "glyphImpactPeak",
        "glyphLockIn",
        "messageRevealStart",
    }
)


class PresentationOverlayError(ValueError):
    pass


def presentation_overlays_dir() -> Path:
    return _OVERLAY_DIR


def safe_relative_overlay_path(asset_ref: str) -> Path:
    needle = (asset_ref or "").strip()
    if not needle or needle.startswith("/") or ".." in needle:
        raise PresentationOverlayError(f"unsafe presentation overlay path: {asset_ref!r}")
    suffix = Path(needle).suffix.lower()
    if suffix not in {".json", ".lottie"}:
        raise PresentationOverlayError("presentation overlay must be .json or .lottie")
    return Path(needle)


def presentation_overlay_exists(asset_ref: str) -> bool:
    try:
        relative = safe_relative_overlay_path(asset_ref)
    except PresentationOverlayError:
        return False
    return (_OVERLAY_DIR / relative).is_file()


def resolve_presentation_overlay_path(asset_ref: str) -> Path:
    relative = safe_relative_overlay_path(asset_ref)
    resolved = _OVERLAY_DIR / relative
    if not resolved.is_file():
        raise FileNotFoundError(asset_ref)
    return resolved


def validate_presentation_overlay(spec: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    kind = str(spec.get("kind") or "").strip().lower()
    if kind not in _ALLOWED_KINDS:
        errors.append(f"presentation_overlay.kind must be one of: {', '.join(sorted(_ALLOWED_KINDS))}")
    anchor = str(spec.get("anchor") or "effect_field").strip()
    if anchor not in _ALLOWED_ANCHORS:
        errors.append(f"presentation_overlay.anchor invalid: {anchor}")
    start = str(spec.get("start_anchor") or "glyphImpactPeak").strip()
    if start not in _ALLOWED_START_ANCHORS:
        errors.append(f"presentation_overlay.start_anchor invalid: {start}")
    asset_ref = str(spec.get("asset_ref") or "").strip()
    if kind == "lottie" and not asset_ref:
        errors.append("presentation_overlay.asset_ref required for lottie kind")
    if asset_ref and not presentation_overlay_exists(asset_ref):
        errors.append(f"presentation overlay asset not found: {asset_ref}")
    return errors


def build_presentation_overlay_entity(spec: dict[str, Any]) -> dict[str, Any] | None:
    if not isinstance(spec, dict) or not spec:
        return None
    errors = validate_presentation_overlay(spec)
    if errors:
        return None
    kind = str(spec.get("kind") or "").strip().lower()
    asset_ref = str(spec.get("asset_ref") or "").strip()
    entity: dict[str, Any] = {
        "kind": kind,
        "anchor": str(spec.get("anchor") or "effect_field"),
        "start_anchor": str(spec.get("start_anchor") or "glyphImpactPeak"),
        "android": str(spec.get("android") or "deferred"),
    }
    if asset_ref:
        entity["asset_ref"] = asset_ref
        entity["asset_url"] = f"/api/hails/presentation-assets/presentation-overlays/{asset_ref.lstrip('/')}"
    if kind == "css_burst":
        entity["css_profile"] = str(spec.get("css_profile") or "spark_radial_v1")
    return entity


def load_lottie_overlay_json(asset_ref: str) -> dict[str, Any]:
    path = resolve_presentation_overlay_path(asset_ref)
    raw = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(raw, dict):
        raise PresentationOverlayError("lottie overlay must be JSON object")
    return raw

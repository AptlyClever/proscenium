"""Storage + path resolution for image-kind Glyph Hero assets (flat PNG/WebP, no projection)."""

from __future__ import annotations

from pathlib import Path
from typing import Any, Final

from settings import _resolve_repo_root

_GLYPH_IMAGES_DIR = _resolve_repo_root() / "config/hails/glyph-hero-images"
_ALLOWED_SUFFIXES = (".png", ".webp")
_LAYER_ROLES: Final[frozenset[str]] = frozenset({"mass", "accent", "ground"})
_PULSE_ANCHORS: Final[frozenset[str]] = frozenset(
    {
        "glyphResolveStart",
        "glyphImpactPeak",
        "glyphLockIn",
        "messageRevealStart",
    }
)


def glyph_images_dir() -> Path:
    return _GLYPH_IMAGES_DIR


def safe_relative_image_path(asset_path: str) -> Path:
    needle = (asset_path or "").strip()
    if not needle or needle.startswith("/") or ".." in needle:
        raise ValueError(f"unsafe image_asset path: {asset_path!r}")
    if not needle.lower().endswith(_ALLOWED_SUFFIXES):
        raise ValueError(f"image_asset path must end in {_ALLOWED_SUFFIXES}: {asset_path!r}")
    return Path(needle)


def glyph_image_asset_exists(asset_path: str) -> bool:
    try:
        relative = safe_relative_image_path(asset_path)
    except ValueError:
        return False
    return (_GLYPH_IMAGES_DIR / relative).is_file()


def resolve_glyph_image_path(asset_path: str) -> Path:
    relative = safe_relative_image_path(asset_path)
    resolved = _GLYPH_IMAGES_DIR / relative
    if not resolved.is_file():
        raise FileNotFoundError(asset_path)
    return resolved


def media_type_for_image_path(path: Path) -> str:
    return "image/webp" if path.suffix.lower() == ".webp" else "image/png"


def normalize_image_layers(raw: Any) -> list[dict[str, Any]]:
    if not isinstance(raw, list):
        return []
    layers: list[dict[str, Any]] = []
    for index, row in enumerate(raw):
        if not isinstance(row, dict):
            continue
        path = str(row.get("path") or "").strip()
        if not path:
            continue
        role = str(row.get("role") or ("mass" if index == 0 else "accent")).strip().lower()
        if role not in _LAYER_ROLES:
            role = "mass" if index == 0 else "accent"
        layer: dict[str, Any] = {"role": role, "path": path}
        z_index = row.get("z_index")
        if isinstance(z_index, (int, float)):
            layer["z_index"] = int(z_index)
        pulse = str(row.get("pulse_anchor") or "").strip()
        if pulse in _PULSE_ANCHORS:
            layer["pulse_anchor"] = pulse
        layers.append(layer)
    return layers


def validate_image_layers(layers: list[dict[str, Any]]) -> list[str]:
    errors: list[str] = []
    if not layers:
        errors.append("image_layers must include at least one layer")
        return errors
    roles = [str(row.get("role") or "") for row in layers]
    if "mass" not in roles:
        errors.append("image_layers requires a mass role layer")
    for row in layers:
        path = str(row.get("path") or "")
        if not glyph_image_asset_exists(path):
            errors.append(f"image layer asset not found: {path}")
    return errors

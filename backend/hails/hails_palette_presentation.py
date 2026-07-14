"""TV presentation surface — palette-backed scrim and message plate (Phase A)."""

from __future__ import annotations

from typing import Any

DEFAULT_PACKAGE_SCRIM_OPACITY = 0.2
DEFAULT_MESSAGE_PLATE_RADIUS_PX = 6
DEFAULT_PACKAGE_CORNER_RADIUS_PX = 12


def _load_contract(contract: dict[str, Any] | None) -> dict[str, Any]:
    if contract is not None:
        return contract
    from hails.hails_render_contract import load_hail_render_contract_for_generation

    return load_hail_render_contract_for_generation("v002-beta")


def _trimmed(value: Any) -> str:
    return value.strip() if isinstance(value, str) else ""


def _palette_entry(palette_id: str, contract: dict[str, Any]) -> dict[str, Any]:
    palettes = contract.get("palettes")
    if not isinstance(palettes, dict):
        return {}
    entry = palettes.get(palette_id)
    return entry if isinstance(entry, dict) else {}


def resolve_palette_presentation(
    palette_id: Any,
    contract: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Project contract palette roles into a consumer-safe presentation block."""
    doc = _load_contract(contract)
    resolved_id = _trimmed(palette_id) or "axiom_dark_cyan"
    entry = _palette_entry(resolved_id, doc)
    if not entry:
        entry = _palette_entry("axiom_dark_cyan", doc)

    roles = entry.get("roles") if isinstance(entry.get("roles"), dict) else {}
    message_backing = _trimmed(roles.get("messageBacking")) or "#121618"
    try:
        message_backing_opacity = float(roles.get("messageBackingOpacity", 0.5))
    except (TypeError, ValueError):
        message_backing_opacity = 0.5
    message_backing_opacity = max(0.2, min(1.0, message_backing_opacity))

    backdrop_tint = _trimmed(entry.get("backdropTint")) or "#0A2E24"
    message_color = _trimmed(entry.get("messageColor")) or _trimmed(roles.get("text")) or "#F0FAF6"

    return {
        "palette_id": resolved_id,
        "backdrop_tint": backdrop_tint,
        "package_scrim_opacity": DEFAULT_PACKAGE_SCRIM_OPACITY,
        "package_corner_radius_px": DEFAULT_PACKAGE_CORNER_RADIUS_PX,
        "message_backing": message_backing,
        "message_backing_opacity": message_backing_opacity,
        "message_plate_radius_px": DEFAULT_MESSAGE_PLATE_RADIUS_PX,
        "message_color": message_color,
        "package_shadow_alpha": 0.28,
    }


def _parse_hex_rgb(hex_color: str) -> tuple[int, int, int] | None:
    raw = _trimmed(hex_color).lstrip("#")
    if len(raw) != 6 or not all(ch in "0123456789abcdefABCDEF" for ch in raw):
        return None
    return int(raw[0:2], 16), int(raw[2:4], 16), int(raw[4:6], 16)


def mix_hex_colors(base: str, accent: str, weight: float) -> str:
    """Linear RGB mix — weight 0 keeps base, 1 becomes accent."""
    base_rgb = _parse_hex_rgb(base)
    accent_rgb = _parse_hex_rgb(accent)
    if base_rgb is None or accent_rgb is None:
        return _trimmed(base) or _trimmed(accent)
    w = max(0.0, min(1.0, float(weight)))
    mixed = tuple(round(base_rgb[i] * (1.0 - w) + accent_rgb[i] * w) for i in range(3))
    return f"#{mixed[0]:02x}{mixed[1]:02x}{mixed[2]:02x}"


# Transporter variation → on-device palette (mirror LCARD broker proof + APK HailRegistry).
_TRANSPORTER_VARIATION_CANONICAL_PALETTES: dict[str, str] = {
    "voyaging": "transporter_white",
    "generation-next": "transporter_generation_next",
    "spoon": "transporter_spoon",
}

# Palettes that defer to variation canonical on delivery (includes domain alias sink).
_VARIATION_PALETTE_RESOLVE_SOURCES: frozenset[str] = frozenset(
    {"axiom_dark_cyan", "transporter_white"}
)


def resolve_delivery_palette_for_overlay(
    palette_id: str,
    effect_variation_id: str | None,
) -> str:
    """Map default or collapsed loadout palettes to variation canonical ids for TV delivery."""
    palette = _trimmed(palette_id) or "axiom_dark_cyan"
    variation = _trimmed(effect_variation_id)
    if not variation:
        return palette
    canonical = _TRANSPORTER_VARIATION_CANONICAL_PALETTES.get(variation)
    if canonical and palette in _VARIATION_PALETTE_RESOLVE_SOURCES:
        return canonical
    return palette

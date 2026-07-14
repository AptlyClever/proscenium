"""Optional accent wash on the Hail Package — not implicit per Alert Level kit."""

from __future__ import annotations

import copy
from typing import Any


def package_accent_wash_spec(visual: dict[str, Any] | None) -> tuple[str, float, float] | None:
    """Return accent hex, scrim mix weight, plate mix weight when declared on visual."""
    if not isinstance(visual, dict):
        return None
    raw = visual.get("accent_wash")
    if not isinstance(raw, dict):
        return None
    accent = raw.get("accent")
    if not isinstance(accent, str) or not accent.strip():
        return None
    try:
        scrim_weight = float(raw.get("scrim_weight"))
    except (TypeError, ValueError):
        return None
    if scrim_weight <= 0:
        return None
    plate_raw = raw.get("plate_weight")
    try:
        plate_weight = float(plate_raw) if plate_raw is not None else scrim_weight
    except (TypeError, ValueError):
        plate_weight = scrim_weight
    return (
        accent.strip(),
        max(0.0, min(1.0, scrim_weight)),
        max(0.0, min(1.0, plate_weight)),
    )


def package_accent_wash_label(visual: dict[str, Any] | None) -> str | None:
    if not isinstance(visual, dict):
        return None
    raw = visual.get("accent_wash")
    if not isinstance(raw, dict):
        return None
    label = raw.get("label")
    if isinstance(label, str) and label.strip():
        return label.strip()
    return None


def apply_package_accent_wash_to_presentation(
    presentation: dict[str, Any],
    visual: dict[str, Any] | None,
) -> dict[str, Any]:
    """Mix package-declared accent into scrim and message plate — palette remains base."""
    spec = package_accent_wash_spec(visual)
    if not spec:
        return presentation
    from hails.hails_palette_presentation import mix_hex_colors

    accent, scrim_weight, plate_weight = spec
    out = copy.deepcopy(presentation)
    out["backdrop_tint"] = mix_hex_colors(str(out.get("backdrop_tint") or "#0A2E24"), accent, scrim_weight)
    out["message_backing"] = mix_hex_colors(str(out.get("message_backing") or "#121618"), accent, plate_weight)
    return out

"""Tests for package-scoped accent wash."""

from __future__ import annotations

from hails.hails_package_accent_wash import apply_package_accent_wash_to_presentation
from hails.hails_palette_presentation import mix_hex_colors, resolve_palette_presentation


def test_no_wash_without_package_field() -> None:
    base = resolve_palette_presentation("axiom_dark_cyan")
    out = apply_package_accent_wash_to_presentation(base, {"priority_level": "green"})
    assert out["backdrop_tint"] == base["backdrop_tint"]
    assert out["message_backing"] == base["message_backing"]


def test_package_accent_wash_on_visual() -> None:
    base = resolve_palette_presentation("axiom_dark_cyan")
    visual = {
        "priority_level": "green",
        "accent_wash": {
            "accent": "#22E870",
            "scrim_weight": 0.46,
            "plate_weight": 0.56,
            "label": "Green wash",
        },
    }
    out = apply_package_accent_wash_to_presentation(base, visual)
    assert out["backdrop_tint"] == mix_hex_colors(base["backdrop_tint"], "#22E870", 0.46)
    assert out["message_backing"] == mix_hex_colors(base["message_backing"], "#22E870", 0.56)

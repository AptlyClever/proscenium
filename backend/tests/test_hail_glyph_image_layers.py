"""Tests for dual-layer image glyph framework (6b)."""

from __future__ import annotations

import base64

from hails.hail_glyph_image_asset import normalize_image_layers, validate_image_layers
from hails.hails_glyph_render import resolve_glyph_render


def test_normalize_image_layers_roles() -> None:
    layers = normalize_image_layers(
        [
            {"role": "mass", "path": "a.png"},
            {"path": "b.png", "pulse_anchor": "glyphImpactPeak"},
        ]
    )
    assert layers[0]["role"] == "mass"
    assert layers[1]["role"] == "accent"
    assert layers[1]["pulse_anchor"] == "glyphImpactPeak"


def test_resolve_image_layers_glyph_render(tmp_path, monkeypatch) -> None:
    import hails.hail_glyph_image_asset as asset_module

    images = tmp_path
    (images / "mass.png").write_bytes(b"\x89PNG\r\n\x1a\nmass")
    (images / "accent.png").write_bytes(b"\x89PNG\r\n\x1a\naccent")
    monkeypatch.setattr(asset_module, "_GLYPH_IMAGES_DIR", images)

    spec = {
        "representation_kind": "image",
        "image_asset": {"path": "combined.png"},
        "image_layers": [
            {"role": "mass", "path": "mass.png", "z_index": 0},
            {"role": "accent", "path": "accent.png", "z_index": 1},
        ],
    }
    (images / "combined.png").write_bytes(b"\x89PNG\r\n\x1a\ncombined")
    assert validate_image_layers(normalize_image_layers(spec["image_layers"])) == []

    authoring = resolve_glyph_render("custom-layered", custom_glyphs={"custom-layered": spec}, consumer_id="axiom_authoring")
    assert authoring["kind"] == "image_layers"
    assert len(authoring["layers"]) == 2
    assert authoring["layers"][0]["image_url"].endswith("mass.png")

    apk = resolve_glyph_render("custom-layered", custom_glyphs={"custom-layered": spec}, consumer_id="google_tv_apk")
    assert apk["kind"] == "image_layers"
    assert len(apk["layers"]) == 2
    assert base64.b64decode(apk["layers"][0]["image_base64"]).startswith(b"\x89PNG")

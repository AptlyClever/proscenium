"""Tests for Google TV glyph_render consumer projection."""

from __future__ import annotations

import hashlib

from hails.hail_glyph_procedural import generate_procedural_graph
from hails.hails_glyph_render import (
    GOOGLE_TV_RENDER_TARGET,
    is_google_tv_glyph_deliverable,
    resolve_glyph_render,
)
from hails.hails_render_contract import build_consumer_render_payload


def _digest(name: str) -> bytes:
    return hashlib.sha256(name.encode()).digest()


def test_resolve_glyph_render_registry() -> None:
    render = resolve_glyph_render("default")
    assert render["kind"] == "registry"
    assert render["glyph_id"] == "default"
    assert is_google_tv_glyph_deliverable(render)


def test_resolve_glyph_render_custom_procedural() -> None:
    graph, _ = generate_procedural_graph(glyph_name="Star Trek", hail_name="", seed=42, digest=_digest("star"))
    custom = {
        "custom-star-trek": {
            "glyph_id": "custom-star-trek",
            "procedural_graph": graph,
        }
    }
    render = resolve_glyph_render("custom-star-trek", custom_glyphs=custom)
    assert render["kind"] == "procedural"
    assert render["representation"] == "projected"
    assert render["projection_id"] == "google_tv_v1"
    assert render["procedural_graph"]["signature"] == graph["signature"] + "-tv"
    assert is_google_tv_glyph_deliverable(render)


def test_resolve_glyph_render_image_kind(tmp_path, monkeypatch) -> None:
    import hails.hail_glyph_image_asset as asset_module

    monkeypatch.setattr(asset_module, "_GLYPH_IMAGES_DIR", tmp_path)
    (tmp_path / "custom-keyboard.png").write_bytes(b"\x89PNG\r\n\x1a\nfake-bytes-for-test")

    custom = {
        "custom-keyboard": {
            "glyph_id": "custom-keyboard",
            "representation_kind": "image",
            "image_asset": {"path": "custom-keyboard.png"},
        }
    }

    authoring = resolve_glyph_render("custom-keyboard", custom_glyphs=custom, consumer_id="axiom_authoring")
    assert authoring["kind"] == "image"
    assert authoring["image_url"] == "/api/hails/glyph-images/custom-keyboard.png"
    assert is_google_tv_glyph_deliverable(authoring)

    apk = resolve_glyph_render("custom-keyboard", custom_glyphs=custom, consumer_id="google_tv_apk")
    assert apk["kind"] == "image"
    assert "image_base64" in apk and apk["image_base64"]
    assert apk["image_media_type"] == "image/png"
    assert "image_url" not in apk


def test_build_consumer_render_payload_includes_glyph_render() -> None:
    graph, _ = generate_procedural_graph(glyph_name="Parity", hail_name="", seed=7, digest=_digest("parity"))
    record = {
        "id": "hail.parity.001",
        "icon": {"kind": "glyph", "value": "custom-parity"},
        "message": {"short_text": "Parity test"},
        "visual": {
            "effect_id": "transporter",
            "scale": "medium",
            "palette_id": "axiom_dark_cyan",
            "placement_id": "upper_center",
        },
    }
    custom = {"custom-parity": {"glyph_id": "custom-parity", "procedural_graph": graph}}
    payload = build_consumer_render_payload(record, custom_glyphs=custom)
    assert payload["render_target"] == GOOGLE_TV_RENDER_TARGET
    assert payload["glyph_render"]["kind"] == "procedural"
    assert payload["glyph_render"]["representation"] == "projected"
    assert payload["glyph_render_canonical"]["representation"] == "canonical"
    assert payload["glyph_id"] == "custom-parity"

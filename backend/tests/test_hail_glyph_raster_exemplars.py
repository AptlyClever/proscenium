"""Second raster exemplar (P2-3) — warden sigil promote + register path."""

from __future__ import annotations

import json
from pathlib import Path

from hails.hail_glyph_image_asset import glyph_image_asset_exists
from settings import _resolve_repo_root


def test_warden_sigil_exemplar_assets_exist() -> None:
    spec_path = _resolve_repo_root() / "config/hails/glyph-exemplars/raster-warden-sigil.v001.json"
    spec = json.loads(spec_path.read_text(encoding="utf-8"))
    assert spec["glyph_id"] == "custom-warden-sigil"
    assert spec["style_base"] == "ca-glow-cutout-v1"
    assert glyph_image_asset_exists(spec["image_asset"]["path"])
    assert "image_layers" not in spec

"""Plot SVG import wiring tests."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from hails.glyph_plot_import import import_authored_svg_for_recipe
from hails.glyph_svg_normalize import SvgNormalizeError
from tests.test_glyph_svg_normalize import _large_combadge_svg


def test_import_authored_svg_for_combadge_recipe(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    assets = tmp_path / "assets"
    assets.mkdir()
    traced_name = "combadge-tng-traced.svg"

    from hails.hail_glyph_combadge import build_combadge_plot_fixture

    fixture = build_combadge_plot_fixture()
    fixture_path = tmp_path / "custom-combadge-plot.fixture.json"
    fixture_path.write_text(json.dumps(fixture, indent=2) + "\n", encoding="utf-8")

    monkeypatch.setattr("hails.glyph_plot_import.plot_fixtures_dir", lambda: tmp_path)
    monkeypatch.setattr("hails.glyph_plot_store._PLOT_FIXTURES_DIR", tmp_path)

    detail = import_authored_svg_for_recipe("char_combadge_delta_v1", _large_combadge_svg())
    assert detail["plot_id"] == "custom-combadge-plot"
    traced = assets / traced_name
    assert traced.is_file()
    assert "viewBox=\"0 0 48 48\"" in traced.read_text(encoding="utf-8")
    paths = detail.get("procedural_graph", {}).get("paths") or []
    assert len(paths) == 2


def test_import_rejects_three_paths() -> None:
    svg = """<svg xmlns="http://www.w3.org/2000/svg">
      <path data-combadge-role="accent" d="M 0 0 L 100 0 L 100 100 Z"/>
      <path data-combadge-role="mass" d="M 10 10 L 90 10 L 50 90 Z"/>
      <path data-combadge-role="ground" d="M 20 20 L 80 20 L 50 80 Z"/>
    </svg>"""
    with pytest.raises(SvgNormalizeError):
        import_authored_svg_for_recipe("char_combadge_delta_v1", svg)

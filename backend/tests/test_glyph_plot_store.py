"""Plot fixture detail — consumer glyph_render blocks."""

from __future__ import annotations

from hails.glyph_plot_store import plot_fixture_detail


def test_plot_fixture_includes_tv_glyph_render() -> None:
    detail = plot_fixture_detail("custom-combadge-plot")
    assert detail["glyph_render_tv"] is not None
    assert detail["glyph_render_canonical"] is not None
    tv = detail["glyph_render_tv"]
    assert tv["kind"] == "procedural"
    assert tv.get("representation") == "projected"
    assert isinstance(tv.get("procedural_graph"), dict)
    assert len(tv["procedural_graph"].get("paths") or []) >= 1

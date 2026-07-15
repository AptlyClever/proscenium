"""Plot fixture gate tests."""

from __future__ import annotations

import json
from pathlib import Path

from hails.glyph_plot_verify import (
    _DEFAULT_FIXTURE,
    load_plot_fixture,
    run_plot_verify,
    verify_plot_heuristics,
    verify_plot_fixture,
)

_FIXTURE = _DEFAULT_FIXTURE


def test_combadge_plot_fixture_passes_gate() -> None:
    fixture = load_plot_fixture(_FIXTURE)
    result = verify_plot_fixture(fixture)
    assert result["heuristic_errors"] == [], result["heuristic_errors"]
    assert result["metric_errors"] == [], result["metric_errors"]
    assert result["longest_edge_dp"] >= 20.0


def test_plot_heuristics_reject_emblem_grammar_ground() -> None:
    fixture = load_plot_fixture(_FIXTURE)
    bad = json.loads(json.dumps(fixture))
    bad["procedural_graph"]["paths"].append(
        {
            "d": "M10 10 L38 38",
            "stroke": "currentColor",
            "stroke_width": 2.0,
            "fill": "none",
            "role": "ground",
        }
    )
    errors = verify_plot_heuristics(bad)
    assert any("emblem grammar" in e for e in errors)


def test_run_plot_verify_writes_strip(tmp_path, monkeypatch) -> None:
    out = tmp_path / "strip.svg"
    fixture = load_plot_fixture(_FIXTURE)

    from hails.glyph_plot_verify import write_plot_strip

    path = write_plot_strip(fixture, out)
    assert path.exists()
    text = path.read_text(encoding="utf-8")
    assert "24px thumbnail" in text
    assert "48px canonical" in text


def test_cli_run_plot_verify() -> None:
    result = run_plot_verify(_FIXTURE)
    assert result["valid"] is True
    assert Path(result["strip_path"]).is_file()

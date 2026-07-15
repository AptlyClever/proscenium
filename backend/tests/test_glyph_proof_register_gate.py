"""Proof-mode register gate."""

from __future__ import annotations

import copy

import pytest

from hails.hail_glyph_combadge import build_combadge_glyph_spec, build_combadge_plot_fixture
from hails.hails_composer import ComposerValidationError, register_custom_glyph
from schemas import AxiomStoredSettings


def test_proof_mode_register_requires_matching_fixture_signature() -> None:
    st = AxiomStoredSettings()
    fixture = build_combadge_plot_fixture()
    spec = build_combadge_glyph_spec()
    spec["proof_mode"] = True
    spec["glyph_family_id"] = fixture["recipe_id"]
    bad_graph = copy.deepcopy(fixture["procedural_graph"])
    bad_graph["paths"][0]["d"] = "M 0 0 L 1 1"
    spec["procedural_graph"] = bad_graph
    with pytest.raises(ComposerValidationError) as exc:
        register_custom_glyph(st, spec)
    messages = " ".join(e["message"] for e in exc.value.errors)
    assert "plot-approved fixture geometry" in messages


def test_plot_approved_combadge_can_register_with_proof_mode() -> None:
    st = AxiomStoredSettings()
    fixture = build_combadge_plot_fixture()
    spec = build_combadge_glyph_spec()
    spec["proof_mode"] = True
    spec["procedural_graph"] = copy.deepcopy(fixture["procedural_graph"])
    spec["glyph_family_id"] = fixture["recipe_id"]
    registered = register_custom_glyph(st, spec)
    assert registered["glyph_id"] == "custom-combadge"

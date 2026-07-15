"""Tests for Hail Effects Gallery v001."""

from __future__ import annotations

import copy

import pytest

from hails.hail_effects_gallery import (
    gallery_presets,
    load_hail_effects_gallery,
    validate_hail_effects_gallery,
)


def test_gallery_loads_successfully() -> None:
    doc = load_hail_effects_gallery()
    assert doc["gallery_id"] == "hail-effects-gallery-v001"
    presets = gallery_presets(doc)
    assert len(presets) >= 5
    assert any(p["id"] == "quiet-signal" for p in presets)


def test_all_presets_map_to_known_contract_values() -> None:
    errors = validate_hail_effects_gallery()
    assert errors == []


def test_invalid_preset_config_fails_validation() -> None:
    doc = copy.deepcopy(load_hail_effects_gallery())
    doc["presets"][0]["visual"]["effect_id"] = "sparkle_storm"
    errors = validate_hail_effects_gallery(doc)
    assert any("/visual/effect_id" in e["path"] for e in errors)


def test_duplicate_preset_id_fails_validation() -> None:
    doc = copy.deepcopy(load_hail_effects_gallery())
    doc["presets"][1]["id"] = doc["presets"][0]["id"]
    errors = validate_hail_effects_gallery(doc)
    assert any("duplicate preset id" in e["message"] for e in errors)


def test_gallery_presets_include_effect_tuning() -> None:
    sweep = next(p for p in gallery_presets() if p["id"] == "transporter-sweep")
    assert sweep.get("effect_id") == "transporter"
    assert sweep.get("effect_tuning", {}).get("beam_shape") == "shimmer"
    assert validate_hail_effects_gallery() == []


def test_invalid_preset_tuning_fails_validation() -> None:
    doc = copy.deepcopy(load_hail_effects_gallery())
    doc["presets"][0]["effect_tuning"]["beam_intensity"] = 99
    errors = validate_hail_effects_gallery(doc)
    assert any("effect_tuning" in e["path"] for e in errors)


def test_quiet_signal_is_reduced_motion_preset() -> None:
    quiet = next(p for p in gallery_presets() if p["id"] == "quiet-signal")
    assert quiet.get("reduced_motion") is True
    assert quiet.get("animation_enabled") is False
    assert quiet["visual"]["effect_id"] == "none"

"""Stale component detection when Forge glyph/effect drift from saved package (B7)."""

from __future__ import annotations

from hails.hail_package_v2 import (
    hail_has_stale_components,
    live_components_fingerprint_for_hail,
    project_hail_stale_components,
    stamp_hail_package_metadata,
)
from hails.hails_composer import build_fixture_glyph_spec, patch_custom_glyph, register_custom_glyph
from hails.hails_domain import create_hail, update_hail
from hails.hails_render_contract import build_consumer_render_payload
from schemas import AxiomStoredSettings


def _route(launch: str = "arcade", destination: str = "master_bedroom") -> dict:
    return {
        "id": f"route.{launch}.{destination}.001",
        "launch_room_id": launch,
        "destination_room_id": destination,
        "provider": "lcard",
        "requires_confirmation": False,
        "enabled": True,
    }


def _sample_hail(**overrides) -> dict:
    hail = {
        "id": "hail.beta.001",
        "name": "Beta hail",
        "enabled": True,
        "icon": {"value": "custom-star"},
        "message": {"short_text": "Hello TV"},
        "visual": {
            "effect_id": "transporter",
            "effect_variation_id": "voyaging",
            "scale": "medium",
            "placement_id": "upper_center",
            "palette_id": "axiom_dark_cyan",
            "duration_ms": 5000,
        },
        "delivery_policy": {"routes": [_route()]},
    }
    hail.update(overrides)
    return hail


def _glyph_spec(seed: int = 11) -> dict:
    """Pipeline-produced spec — hand-built graphs no longer pass the hero grammar gate."""
    return build_fixture_glyph_spec(
        glyph_name="Star",
        glyph_id="custom-star",
        seed=seed,
        scale="medium",
        palette_id="axiom_dark_cyan",
        effect_id="transporter",
    )


def _drifted_graph() -> dict:
    """Valid graph from the same recipe at a different seed — Forge drift stand-in."""
    return _glyph_spec(seed=99)["procedural_graph"]


def test_saved_hail_not_stale_without_forge_drift(tmp_path, monkeypatch) -> None:
    monkeypatch.setenv("AXIOM_SETTINGS_PATH", str(tmp_path / "settings.json"))
    st = AxiomStoredSettings(hails=[])
    register_custom_glyph(st, _glyph_spec())
    hail = create_hail(
        _sample_hail(),
        [],
        glyph_allowlist=("custom-star", "default", "default"),
        custom_glyphs=st.custom_glyphs,
    )
    projected = project_hail_stale_components(hail, custom_glyphs=st.custom_glyphs)
    assert projected.get("stale_components") is not True


def test_forge_glyph_patch_flags_stale_components(tmp_path, monkeypatch) -> None:
    monkeypatch.setenv("AXIOM_SETTINGS_PATH", str(tmp_path / "settings.json"))
    st = AxiomStoredSettings(hails=[])
    register_custom_glyph(st, _glyph_spec())
    hail = create_hail(
        _sample_hail(),
        [],
        glyph_allowlist=("custom-star", "default", "default"),
        custom_glyphs=st.custom_glyphs,
    )
    patch_custom_glyph(
        st,
        "custom-star",
        {"procedural_graph": _drifted_graph()},
    )
    projected = project_hail_stale_components(hail, custom_glyphs=st.custom_glyphs)
    assert projected["stale_components"] is True
    detail = projected["stale_components_detail"]
    assert detail["saved_fingerprint"] != detail["live_fingerprint"]


def test_re_save_clears_stale_components(tmp_path, monkeypatch) -> None:
    monkeypatch.setenv("AXIOM_SETTINGS_PATH", str(tmp_path / "settings.json"))
    st = AxiomStoredSettings(hails=[])
    register_custom_glyph(st, _glyph_spec())
    hail = create_hail(
        _sample_hail(),
        [],
        glyph_allowlist=("custom-star", "default", "default"),
        custom_glyphs=st.custom_glyphs,
    )
    patch_custom_glyph(
        st,
        "custom-star",
        {"procedural_graph": _drifted_graph()},
    )
    assert hail_has_stale_components(hail, custom_glyphs=st.custom_glyphs) is True
    refreshed = update_hail(
        hail["id"],
        hail,
        [hail],
        glyph_allowlist=("custom-star", "default", "default"),
        custom_glyphs=st.custom_glyphs,
    )
    assert hail_has_stale_components(refreshed, custom_glyphs=st.custom_glyphs) is False

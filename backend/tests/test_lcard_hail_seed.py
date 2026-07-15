"""LCARD Hail definition seed merge tests."""

from __future__ import annotations

from lcard_effective import effective_lcard_app_settings
from lcard_hail_seed import load_lcard_hail_seed, merge_lcard_hail_seed
from schemas import AxiomStoredSettings


def test_load_lcard_hail_seed_contains_spoon_transporter() -> None:
    hails = load_lcard_hail_seed()
    assert len(hails) == 1
    seed = hails[0]
    assert seed.get("id") == "hail.spoon_transporter.001"
    assert seed.get("enabled") is True
    assert seed["icon"]["kind"] == "glyph"
    assert seed["icon"]["value"] == "custom-spoon-transporter"
    assert seed["icon"]["label"] == "Spoon"
    assert seed["visual"]["scale"] == "medium"
    assert seed["visual"]["effect_id"] == "transporter"
    assert seed["visual"]["effect_variation_id"] == "spoon"
    rooms = seed["rooms"]
    assert rooms["allowed_source_room_ids"] == ["arcade"]
    assert rooms["allowed_target_room_ids"] == ["master_bedroom", "away_team", "arcade"]
    routes = seed["delivery_policy"]["routes"]
    assert len(routes) == 2
    pairs = {(r["launch_room_id"], r["destination_room_id"]) for r in routes}
    assert pairs == {("arcade", "master_bedroom"), ("arcade", "away_team")}


def test_merge_lcard_hail_seed_when_absent() -> None:
    merged = merge_lcard_hail_seed({"schema_version": 1})
    assert isinstance(merged.get("hails"), list)
    assert merged["hails"][0]["id"] == "hail.spoon_transporter.001"


def test_merge_lcard_hail_seed_preserves_operator_hails() -> None:
    operator = [{"id": "hail.custom.001"}]
    merged = merge_lcard_hail_seed({"schema_version": 1, "hails": operator})
    assert merged["hails"] == operator


def test_effective_lcard_includes_hail_seed() -> None:
    st = AxiomStoredSettings.model_validate(
        {
            "themes": [],
            "bindings": {},
            "branding": {"global": {}, "per_app": {}},
            "app_settings": {"lcard": {"schema_version": 1}},
        }
    )
    app_settings = effective_lcard_app_settings(st)
    hails = app_settings.get("hails")
    assert isinstance(hails, list)
    assert any(hail.get("id") == "hail.spoon_transporter.001" for hail in hails)


def test_effective_lcard_seed_includes_custom_glyph_library() -> None:
    st = AxiomStoredSettings.model_validate(
        {
            "themes": [],
            "bindings": {},
            "branding": {"global": {}, "per_app": {}},
            "app_settings": {"lcard": {"schema_version": 1}},
        }
    )
    app_settings = effective_lcard_app_settings(st)
    custom = app_settings.get("custom_glyphs")
    assert isinstance(custom, list)
    assert any(g.get("glyph_id") == "custom-spoon-transporter" for g in custom)


def test_effective_lcard_seed_glyph_render_procedural() -> None:
    st = AxiomStoredSettings.model_validate(
        {
            "themes": [],
            "bindings": {},
            "branding": {"global": {}, "per_app": {}},
            "app_settings": {"lcard": {"schema_version": 1}},
        }
    )
    app_settings = effective_lcard_app_settings(st)
    seed = next(h for h in app_settings["hails"] if h["id"] == "hail.spoon_transporter.001")
    assert seed["glyph_render"]["kind"] == "procedural"


def test_effective_lcard_seed_fallback_includes_effective_by_launch_room() -> None:
    st = AxiomStoredSettings.model_validate(
        {
            "themes": [],
            "bindings": {},
            "branding": {"global": {}, "per_app": {}},
            "app_settings": {"lcard": {"schema_version": 1}},
        }
    )
    app_settings = effective_lcard_app_settings(st)
    seed = next(h for h in app_settings["hails"] if h["id"] == "hail.spoon_transporter.001")
    routes = seed["delivery_policy"]["routes"]
    enabled = [r for r in routes if r.get("enabled") is not False]
    assert len(enabled) == 2
    pairs = {(r["launch_room_id"], r["destination_room_id"]) for r in enabled}
    assert pairs == {("arcade", "master_bedroom"), ("arcade", "away_team")}

    effective = seed["delivery_policy"]["effective_by_launch_room"]
    assert effective["arcade"]["configured_target"] is None
    assert {r["destination_room_id"] for r in effective["arcade"]["routes"]} == {
        "master_bedroom",
        "away_team",
    }
    assert "master_bedroom" not in effective or not any(
        r.get("destination_room_id") == "arcade"
        for r in effective.get("master_bedroom", {}).get("routes", [])
    )
    assert ("master_bedroom", "arcade") not in pairs

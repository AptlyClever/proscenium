"""Tests for Hails Composer v001."""

from __future__ import annotations

import copy
import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from hails.glyph_registry import load_glyph_registry
from hails.hails_composer import (
    ComposerValidationError,
    build_fixture_glyph_spec,
    register_custom_glyph,
    seed_glyph_spec,
    validate_custom_glyph_spec,
)
from lcard_effective import effective_lcard_app_settings
from schemas import AxiomStoredSettings
from main import app
from settings import settings


def _client(tmp_path: Path, monkeypatch) -> TestClient:
    p = tmp_path / "axiom-settings.json"
    p.write_text(json.dumps({}), encoding="utf-8")
    monkeypatch.setattr(settings, "settings_path", p)
    return TestClient(app)


def test_seed_glyph_spec_rejects_sub_floor_family() -> None:
    with pytest.raises(ComposerValidationError) as exc:
        seed_glyph_spec(
            glyph_name="Thin Ray Gate",
            seed=7,
            glyph_family_id="slot_band_ray",
            variation_only=True,
        )
    messages = [row["message"] for row in exc.value.errors]
    assert any("below hero optical floor" in message for message in messages)


def test_build_fixture_glyph_spec_deterministic() -> None:
    a = build_fixture_glyph_spec(glyph_name="Party Spark", hail_name="Can I see this")
    b = build_fixture_glyph_spec(glyph_name="Party Spark", hail_name="Can I see this")
    assert a == b
    assert a["glyph_id"].startswith("custom-")
    assert a["visual"]["effect_id"] in {"none", "pop", "burst", "transporter"}
    assert a["procedural_graph"]["version"] == 1
    assert len(a["procedural_graph"]["paths"]) >= 1
    assert a["semantic_bucket"] == "spark"
    assert a["fallback_emoji"] == "✦"
    assert a["visual"]["scale"] == "medium"


def test_build_fixture_glyph_spec_honors_explicit_scale() -> None:
    spec = build_fixture_glyph_spec(glyph_name="Route Glyph", scale="large")
    assert spec["visual"]["scale"] == "large"


def test_build_fixture_glyph_spec_honors_loadout_palette_and_effect() -> None:
    spec = build_fixture_glyph_spec(
        glyph_name="Arcade Ping",
        palette_id="cute_purple",
        effect_id="burst",
    )
    assert spec["visual"]["palette_id"] == "cute_purple"
    assert spec["visual"]["effect_id"] in {"burst", "none"}


def test_seed_glyph_semantic_bucket_from_glyph_name_not_hail() -> None:
    spec = build_fixture_glyph_spec(glyph_name="Party", hail_name="Can I see this")
    assert spec["semantic_bucket"] == "spark"


def test_seed_glyph_semantic_bucket_from_hail_when_generic_glyph() -> None:
    spec = build_fixture_glyph_spec(glyph_name="New Glyph", hail_name="Can I see this")
    assert spec["semantic_bucket"] == "sense"


def test_seed_glyph_regenerate_differs_with_seed() -> None:
    a = build_fixture_glyph_spec(glyph_name="Test", seed=1)
    b = build_fixture_glyph_spec(glyph_name="Test", seed=2)
    assert a != b


def test_seed_glyph_try_another_spreads_signatures() -> None:
    signatures = {
        build_fixture_glyph_spec(glyph_name="Forge Try", seed=s)["procedural_graph"]["signature"] for s in range(1, 20)
    }
    assert len(signatures) >= 5
    assert all(
        spec["procedural_graph"].get("envelope_id") == "ghost_shield_v1"
        for spec in (build_fixture_glyph_spec(glyph_name="Forge Try", seed=s) for s in (1, 2, 3))
    )


def test_seed_glyph_regenerate_keeps_family() -> None:
    a = build_fixture_glyph_spec(glyph_name="Star Trek", seed=1)
    family = a.get("glyph_family_id")
    assert family
    b = build_fixture_glyph_spec(
        glyph_name="Star Trek",
        seed=2,
        glyph_family_id=family,
        variation_only=True,
    )
    assert b.get("glyph_family_id") == family
    assert a["procedural_graph"]["generator_id"] == b["procedural_graph"]["generator_id"]
    assert a["procedural_graph"]["signature"] != b["procedural_graph"]["signature"]


def test_seed_glyph_preserves_glyph_id_when_editing() -> None:
    original = build_fixture_glyph_spec(glyph_name="Forge Edit", seed=1)
    glyph_id = original["glyph_id"]
    reset = build_fixture_glyph_spec(glyph_name="Forge Edit Renamed", seed=99, glyph_id=glyph_id)
    assert reset["glyph_id"] == glyph_id
    regen = build_fixture_glyph_spec(
        glyph_name="Forge Edit Renamed",
        seed=2,
        glyph_id=glyph_id,
        glyph_family_id=original.get("glyph_family_id"),
        variation_only=True,
    )
    assert regen["glyph_id"] == glyph_id


def test_invalid_custom_glyph_spec_rejected() -> None:
    errors = validate_custom_glyph_spec({"glyph_id": "default", "label": "x"})
    assert any("/glyph_id" in e["path"] for e in errors)


def test_validate_custom_glyph_spec_rejects_nonnumeric_graph_version() -> None:
    errors = validate_custom_glyph_spec(
        {
            "glyph_id": "custom-bad-graph",
            "label": "Bad Graph",
            "source": "composer",
            "procedural_graph": {"version": "v1", "paths": [{"d": "M10 10 L90 90"}]},
        }
    )
    assert any(e["path"] == "/procedural_graph" for e in errors)


def test_register_glyph_api_rejects_nonnumeric_graph_version(tmp_path, monkeypatch) -> None:
    client = _client(tmp_path, monkeypatch)
    r = client.post(
        "/api/hails/composer/register-glyph",
        json={
            "glyph_id": "custom-bad-graph",
            "label": "Bad Graph",
            "source": "composer",
            "procedural_graph": {"version": "v1", "paths": [{"d": "M10 10 L90 90"}]},
        },
    )
    assert r.status_code == 422
    errors = r.json()["detail"]["validation_errors"]
    assert any(e["path"] == "/procedural_graph" for e in errors)


def test_register_glyph_api_rejects_hero_quality_failure(tmp_path, monkeypatch) -> None:
    client = _client(tmp_path, monkeypatch)
    spec = build_fixture_glyph_spec(glyph_name="Hero Reject Test")
    bad_graph = copy.deepcopy(spec["procedural_graph"])
    bad_graph["paths"] = bad_graph["paths"][:1]
    spec["procedural_graph"] = bad_graph
    r = client.post("/api/hails/composer/register-glyph", json=spec)
    assert r.status_code == 422
    errors = r.json()["detail"]["validation_errors"]
    assert any(e["path"] == "/procedural_graph" for e in errors)


def test_validate_glyph_hero_api(tmp_path, monkeypatch) -> None:
    client = _client(tmp_path, monkeypatch)
    fixture = build_fixture_glyph_spec(glyph_name="Validate Fixture")
    ok = client.post("/api/hails/composer/validate-glyph-hero", json=fixture)
    assert ok.status_code == 200
    assert ok.json()["valid"] is True
    assert ok.json()["errors"] == []

    bad = copy.deepcopy(fixture)
    bad["procedural_graph"] = {
        "version": 1,
        "paths": [{"d": "M1 1 L2 2", "stroke_width": 1, "opacity": 1}],
    }
    fail = client.post("/api/hails/composer/validate-glyph-hero", json=bad)
    assert fail.status_code == 200
    body = fail.json()
    assert body["valid"] is False
    assert body["errors"]


def test_register_glyph_rejects_duplicate_thumbnail_signature(tmp_path, monkeypatch) -> None:
    client = _client(tmp_path, monkeypatch)
    first = build_fixture_glyph_spec(glyph_name="Distinct Alpha")
    assert client.post("/api/hails/composer/register-glyph", json=first).status_code == 200

    duplicate = build_fixture_glyph_spec(glyph_name="Distinct Beta")
    duplicate["glyph_id"] = "custom-distinct-beta"
    duplicate["procedural_graph"] = copy.deepcopy(first["procedural_graph"])
    r = client.post("/api/hails/composer/register-glyph", json=duplicate)
    assert r.status_code == 422
    errors = r.json()["detail"]["validation_errors"]
    assert any("thumbnail signature" in e["message"] for e in errors)


def test_seed_glyph_api_rejects_sub_floor_family(tmp_path, monkeypatch) -> None:
    client = _client(tmp_path, monkeypatch)
    r = client.post(
        "/api/hails/composer/seed-glyph",
        json={
            "glyph_name": "Thin Ray",
            "seed": 7,
            "glyph_family_id": "slot_band_ray",
            "variation_only": True,
        },
    )
    assert r.status_code == 422, r.text
    errors = r.json()["detail"]["validation_errors"]
    assert any("below hero optical floor" in e["message"] for e in errors)


def test_register_custom_glyph_persists(tmp_path, monkeypatch) -> None:
    client = _client(tmp_path, monkeypatch)
    spec = build_fixture_glyph_spec(glyph_name="Composer Test")
    r = client.post("/api/hails/composer/register-glyph", json=spec)
    assert r.status_code == 200
    assert r.json()["glyph_id"] == spec["glyph_id"]

    listed = client.get("/api/hails").json()
    assert spec["glyph_id"] in listed["known_glyphs"]
    assert any(e["glyph_id"] == spec["glyph_id"] for e in listed["glyph_catalog"])


def test_register_custom_glyph_provisions_companion_hail(tmp_path, monkeypatch) -> None:
    client = _client(tmp_path, monkeypatch)
    spec = build_fixture_glyph_spec(glyph_name="LCARD Parity Glyph")
    r = client.post("/api/hails/composer/register-glyph", json=spec)
    assert r.status_code == 200
    glyph_id = r.json()["glyph_id"]

    listed = client.get("/api/hails").json()
    matching = [
        h
        for h in listed["hails"]
        if isinstance(h.get("icon"), dict) and h["icon"].get("value") == glyph_id
    ]
    assert len(matching) == 1
    assert matching[0]["enabled"] is True
    assert matching[0]["delivery_policy"]["routes"][0]["launch_room_id"] == "arcade"

    eff_hails = effective_lcard_app_settings()["hails"]
    assert any(h["icon"]["value"] == glyph_id for h in eff_hails)
    eff_row = next(h for h in eff_hails if h["icon"]["value"] == glyph_id)
    assert eff_row["glyph_render"]["kind"] == "procedural"


def test_kind_glyph_register_projects_deliverable_render_payload(tmp_path, monkeypatch) -> None:
    """Step 9 — Kind generator glyph save → effective + derive-preview glyph_render."""
    from hails.hail_glyph_character import is_character_recipe_id
    from hails.hail_glyph_people import is_person_recipe_id
    from hails.hail_glyph_places import is_place_recipe_id
    from hails.hail_glyph_slots import is_slot_recipe_id
    from hails.hails_glyph_render import is_google_tv_glyph_deliverable

    client = _client(tmp_path, monkeypatch)
    spec = build_fixture_glyph_spec(glyph_name="Operator E2E Glyph")
    family = spec.get("glyph_family_id") or spec["procedural_graph"]["generator_id"]
    assert (
        is_slot_recipe_id(family)
        or family.startswith("icon_")
        or is_character_recipe_id(family)
        or is_place_recipe_id(family)
        or is_person_recipe_id(family)
    )

    r = client.post("/api/hails/composer/register-glyph", json=spec)
    assert r.status_code == 200
    glyph_id = r.json()["glyph_id"]

    listed = client.get("/api/hails").json()
    hail = next(h for h in listed["hails"] if h.get("icon", {}).get("value") == glyph_id)
    preview = client.post("/api/hails/derive-preview", json={"record": hail}).json()
    payload = preview["render_payload"]
    assert payload["glyph_id"] == glyph_id
    assert payload["glyph_render"]["kind"] == "procedural"
    assert is_google_tv_glyph_deliverable(payload["glyph_render"])

    eff_row = next(h for h in effective_lcard_app_settings()["hails"] if h["icon"]["value"] == glyph_id)
    assert eff_row["glyph_render"]["procedural_graph"]["generator_id"] == spec["procedural_graph"]["generator_id"]


def test_create_hail_with_custom_glyph(tmp_path, monkeypatch) -> None:
    client = _client(tmp_path, monkeypatch)
    spec = build_fixture_glyph_spec(glyph_name="Inline Glyph")
    client.post("/api/hails/composer/register-glyph", json=spec)
    body = {
        "name": "Composer Hail",
        "message": {"short_text": "Hello composer"},
        "icon": {"kind": "glyph", "value": spec["glyph_id"]},
        "visual": spec["visual"],
        "delivery_policy": {
            "routes": [
                {
                    "id": "route-arcade-master-bedroom",
                    "launch_room_id": "arcade",
                    "destination_room_id": "master_bedroom",
                    "provider": "lcard",
                    "requires_confirmation": False,
                    "enabled": True,
                }
            ]
        },
    }
    r = client.post("/api/hails", json=body)
    assert r.status_code == 200
    assert r.json()["icon"]["value"] == spec["glyph_id"]


def test_create_hail_registry_glyph_unchanged(tmp_path, monkeypatch) -> None:
    client = _client(tmp_path, monkeypatch)
    before = load_glyph_registry()
    body = {
        "name": "Registry Glyph Hail",
        "message": {"short_text": "Hello"},
        "icon": {"kind": "glyph", "value": "default"},
        "delivery_policy": {
            "routes": [
                {
                    "id": "route-arcade-master-bedroom",
                    "launch_room_id": "arcade",
                    "destination_room_id": "master_bedroom",
                    "provider": "lcard",
                    "requires_confirmation": False,
                    "enabled": True,
                }
            ]
        },
    }
    r = client.post("/api/hails", json=body)
    assert r.status_code == 200
    assert load_glyph_registry() == before


def test_unknown_glyph_still_rejected(tmp_path, monkeypatch) -> None:
    client = _client(tmp_path, monkeypatch)
    body = {
        "name": "Bad Glyph",
        "message": {"short_text": "Hello"},
        "icon": {"kind": "glyph", "value": "not-a-glyph"},
        "delivery_policy": {
            "routes": [
                {
                    "id": "route-arcade-master-bedroom",
                    "launch_room_id": "arcade",
                    "destination_room_id": "master_bedroom",
                    "provider": "lcard",
                    "requires_confirmation": False,
                    "enabled": True,
                }
            ]
        },
    }
    r = client.post("/api/hails", json=body)
    assert r.status_code == 422


def test_register_image_kind_glyph_requires_no_procedural_graph(tmp_path, monkeypatch) -> None:
    import hails.hail_glyph_image_asset as asset_module

    monkeypatch.setattr(asset_module, "_GLYPH_IMAGES_DIR", tmp_path)
    (tmp_path / "custom-keyboard.png").write_bytes(b"\x89PNG\r\n\x1a\nfake-bytes-for-test")

    st = AxiomStoredSettings()
    spec = {
        "glyph_id": "custom-keyboard",
        "label": "Keyboard",
        "representation_kind": "image",
        "image_asset": {"path": "custom-keyboard.png"},
    }
    registered = register_custom_glyph(st, spec)
    assert registered["representation_kind"] == "image"
    assert registered["image_asset"]["path"] == "custom-keyboard.png"
    assert "procedural_graph" not in registered


def test_register_image_kind_glyph_rejects_missing_asset() -> None:
    spec = {
        "glyph_id": "custom-missing-image",
        "label": "Missing",
        "representation_kind": "image",
        "image_asset": {"path": "does-not-exist.png"},
    }
    errors = validate_custom_glyph_spec(spec)
    assert any(e["path"] == "/image_asset/path" for e in errors)


def test_register_conflicts_with_registry_glyph() -> None:
    st = AxiomStoredSettings()
    with pytest.raises(ComposerValidationError):
        register_custom_glyph(st, {"glyph_id": "default", "label": "Default copy"})


def _hail_body_with_glyph(glyph_id: str, **visual_overrides) -> dict:
    visual = {
        "effect_id": "transporter",
        "effect_variation_id": "voyaging",
        "scale": "medium",
        "placement_id": "upper_center",
        "placement_mode": "preset",
        "palette_id": "axiom_dark_cyan",
        "duration_ms": 5000,
        **visual_overrides,
    }
    return {
        "name": "Composer Hail",
        "message": {"short_text": "Hello composer"},
        "icon": {"kind": "glyph", "value": glyph_id},
        "visual": visual,
        "delivery_policy": {
            "routes": [
                {
                    "id": "route-arcade-master-bedroom",
                    "launch_room_id": "arcade",
                    "destination_room_id": "master_bedroom",
                    "provider": "lcard",
                    "requires_confirmation": False,
                    "enabled": True,
                }
            ]
        },
    }


def test_derive_preview_accepts_unsaved_custom_glyph_overlay(tmp_path, monkeypatch) -> None:
    client = _client(tmp_path, monkeypatch)
    spec = build_fixture_glyph_spec(glyph_name="Forge Draft")
    record = {
        "name": "Forge preview",
        "message": {"short_text": "Draft"},
        "icon": {"kind": "glyph", "value": spec["glyph_id"]},
        "enabled": True,
        "visual": spec["visual"],
    }
    r = client.post(
        "/api/hails/derive-preview",
        json={"record": record, "custom_glyphs": {spec["glyph_id"]: spec}},
    )
    assert r.status_code == 200
    body = r.json()
    assert not any(e["path"] == "/icon/value" for e in body["validation"]["errors"])
    assert spec["glyph_id"] in body["allowlists"]["glyphs"]
    glyph_render = body["render_payload"]["glyph_render"]
    assert glyph_render["kind"] == "procedural"
    assert len(glyph_render["procedural_graph"]["paths"]) >= 2
    assert glyph_render["procedural_graph"]["generator_id"]


def test_derive_preview_accepts_registered_custom_glyph(tmp_path, monkeypatch) -> None:
    client = _client(tmp_path, monkeypatch)
    spec = build_fixture_glyph_spec(glyph_name="Preview Glyph")
    client.post("/api/hails/composer/register-glyph", json=spec)
    created = client.post(
        "/api/hails",
        json={
            **_hail_body_with_glyph(spec["glyph_id"]),
            "visual": {**spec["visual"], "effect_id": "transporter", "effect_variation_id": "voyaging"},
        },
    ).json()
    r = client.post(
        "/api/hails/derive-preview",
        json={"hail_id": created["id"], "record": created},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["validation"]["valid"] is True
    assert not any(e["path"] == "/icon/value" for e in body["validation"]["errors"])
    assert spec["glyph_id"] in body["allowlists"]["glyphs"]


def test_update_hail_with_registered_custom_glyph(tmp_path, monkeypatch) -> None:
    client = _client(tmp_path, monkeypatch)
    created = client.post("/api/hails", json=_hail_body_with_glyph("default")).json()
    hail_id = created["id"]
    spec = build_fixture_glyph_spec(glyph_name="Updated Inline Glyph")
    client.post("/api/hails/composer/register-glyph", json=spec)
    update = {
        **_hail_body_with_glyph(spec["glyph_id"]),
        "visual": {**spec["visual"], "effect_id": "transporter", "effect_variation_id": "voyaging"},
        "name": "Updated Composer Hail",
    }
    r = client.put(f"/api/hails/{hail_id}", json=update)
    assert r.status_code == 200
    assert r.json()["icon"]["value"] == spec["glyph_id"]
    assert r.json()["name"] == "Updated Composer Hail"


def test_update_hail_derive_preview_valid_with_custom_glyph(tmp_path, monkeypatch) -> None:
    client = _client(tmp_path, monkeypatch)
    created = client.post("/api/hails", json=_hail_body_with_glyph("default")).json()
    hail_id = created["id"]
    spec = build_fixture_glyph_spec(glyph_name="Preview Update Glyph")
    client.post("/api/hails/composer/register-glyph", json=spec)
    updated = client.put(
        f"/api/hails/{hail_id}",
        json={
            **_hail_body_with_glyph(spec["glyph_id"]),
            "visual": {**spec["visual"], "effect_id": "transporter", "effect_variation_id": "voyaging"},
        },
    ).json()
    r = client.post(
        "/api/hails/derive-preview",
        json={"hail_id": hail_id, "record": updated},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["validation"]["valid"] is True
    assert spec["glyph_id"] in body["allowlists"]["glyphs"]


def test_update_hail_unknown_glyph_rejected(tmp_path, monkeypatch) -> None:
    client = _client(tmp_path, monkeypatch)
    created = client.post("/api/hails", json=_hail_body_with_glyph("default")).json()
    hail_id = created["id"]
    r = client.put(f"/api/hails/{hail_id}", json=_hail_body_with_glyph("not-a-glyph"))
    assert r.status_code == 422


def test_composer_edit_patch_preserves_advanced_fields(tmp_path, monkeypatch) -> None:
    """Composer-style PUT omits delivery_policy/behavior; backend merge must preserve them."""
    client = _client(tmp_path, monkeypatch)
    create_body = {
        "name": "Advanced Hail",
        "message": {"short_text": "Original"},
        "icon": {"kind": "glyph", "value": "default"},
        "behavior": {"cooldown_sec": 120, "requires_confirmation": True},
        "rooms": {"badge_policy": "destination_room"},
        "delivery_policy": {
            "routes": [
                {
                    "id": "route.arcade.master_bedroom.001",
                    "launch_room_id": "arcade",
                    "destination_room_id": "master_bedroom",
                    "provider": "lcard",
                    "requires_confirmation": True,
                    "enabled": True,
                },
                {
                    "id": "route.master_bedroom.arcade.001",
                    "launch_room_id": "master_bedroom",
                    "destination_room_id": "arcade",
                    "provider": "lcard",
                    "requires_confirmation": False,
                    "enabled": False,
                },
            ]
        },
    }
    created = client.post("/api/hails", json=create_body).json()
    hail_id = created["id"]

    composer_patch = {
        "name": "Renamed via Composer",
        "enabled": True,
        "message": {"short_text": "Updated message"},
        "icon": {"kind": "glyph", "value": "default"},
        "visual": {"effect_id": "transporter", "scale": "medium", "palette_id": "axiom_dark_cyan"},
    }
    updated = client.put(f"/api/hails/{hail_id}", json=composer_patch).json()

    assert updated["name"] == "Renamed via Composer"
    assert updated["message"]["short_text"] == "Updated message"
    assert len(updated["delivery_policy"]["routes"]) == 2
    assert updated["delivery_policy"]["routes"][0]["requires_confirmation"] is True
    assert updated["delivery_policy"]["routes"][1]["enabled"] is False
    assert updated["behavior"]["cooldown_sec"] == 120
    assert updated["behavior"]["requires_confirmation"] is True
    assert updated["rooms"]["badge_policy"] == "destination_room"


def test_derive_preview_still_rejects_unknown_glyph(tmp_path, monkeypatch) -> None:
    client = _client(tmp_path, monkeypatch)
    seed = {
        "name": "Draft",
        "display_id": "999",
        "message": {"short_text": "Hello"},
        "icon": {"kind": "glyph", "value": "not-a-glyph"},
        "delivery_policy": {
            "routes": [
                {
                    "id": "route-arcade-master-bedroom",
                    "launch_room_id": "arcade",
                    "destination_room_id": "master_bedroom",
                    "provider": "lcard",
                    "requires_confirmation": False,
                    "enabled": True,
                }
            ]
        },
    }
    r = client.post("/api/hails/derive-preview", json={"record": seed})
    assert r.status_code == 200
    assert r.json()["validation"]["valid"] is False
    assert any(e["path"] == "/icon/value" for e in r.json()["validation"]["errors"])

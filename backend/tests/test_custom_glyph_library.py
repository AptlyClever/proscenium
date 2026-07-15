"""Tests for Custom Glyph Library v001."""

from __future__ import annotations

import json
from pathlib import Path

from fastapi.testclient import TestClient

from hails.hails_composer import build_fixture_glyph_spec, patch_custom_glyph, register_custom_glyph
from main import app
from settings import settings


def _client(tmp_path: Path, monkeypatch) -> TestClient:
    p = tmp_path / "axiom-settings.json"
    p.write_text(json.dumps({}), encoding="utf-8")
    monkeypatch.setattr(settings, "settings_path", p)
    return TestClient(app)


def _route_body(glyph_id: str = "default") -> dict:
    return {
        "name": "Library Hail",
        "message": {"short_text": "Hello"},
        "icon": {"kind": "glyph", "value": glyph_id},
        "delivery_policy": {
            "routes": [
                {
                    "id": "route.arcade.master_bedroom.001",
                    "launch_room_id": "arcade",
                    "destination_room_id": "master_bedroom",
                    "provider": "lcard",
                    "requires_confirmation": False,
                    "enabled": True,
                }
            ]
        },
    }


def test_rename_custom_glyph_preserves_id(tmp_path, monkeypatch) -> None:
    client = _client(tmp_path, monkeypatch)
    spec = build_fixture_glyph_spec(glyph_name="Party Spark")
    created = client.post("/api/hails/composer/register-glyph", json=spec).json()
    glyph_id = created["glyph_id"]

    renamed = client.patch(
        f"/api/hails/composer/custom-glyphs/{glyph_id}",
        json={"label": "Renamed Spark"},
    ).json()
    assert renamed["glyph_id"] == glyph_id
    assert renamed["label"] == "Renamed Spark"

    listed = client.get("/api/hails").json()
    stored = next(g for g in listed["custom_glyphs"] if g["glyph_id"] == glyph_id)
    assert stored["label"] == "Renamed Spark"


def test_archive_custom_glyph_hail_remains_valid(tmp_path, monkeypatch) -> None:
    client = _client(tmp_path, monkeypatch)
    spec = build_fixture_glyph_spec(glyph_name="Archive Me")
    registered = client.post("/api/hails/composer/register-glyph", json=spec).json()
    glyph_id = registered["glyph_id"]
    hail = client.post(
        "/api/hails",
        json={**_route_body(glyph_id), "visual": spec["visual"]},
    ).json()

    archived = client.patch(
        f"/api/hails/composer/custom-glyphs/{glyph_id}",
        json={"archived": True},
    ).json()
    assert archived["archived"] is True

    updated_hail = client.put(f"/api/hails/{hail['id']}", json={"name": "Still valid"}).json()
    assert updated_hail["icon"]["value"] == glyph_id

    preview = client.post(
        "/api/hails/derive-preview",
        json={"hail_id": hail["id"], "record": updated_hail},
    ).json()
    assert preview["validation"]["valid"] is True
    assert glyph_id in preview["allowlists"]["glyphs"]


def test_patch_custom_glyph_visual_and_procedural(tmp_path, monkeypatch) -> None:
    client = _client(tmp_path, monkeypatch)
    spec = build_fixture_glyph_spec(glyph_name="Patchable")
    registered = client.post("/api/hails/composer/register-glyph", json=spec).json()
    glyph_id = registered["glyph_id"]

    patched = client.patch(
        f"/api/hails/composer/custom-glyphs/{glyph_id}",
        json={
            "label": "Patched Spark",
            "visual": {
                "effect_id": "none",
                "palette_id": "axiom_dark_cyan",
                "scale": "large",
                "duration_ms": 4200,
                "placement_id": "upper_center",
                "placement_mode": "preset",
            },
            "speed_tier": "fast",
            "transition_style": "pulse",
        },
    ).json()
    assert patched["label"] == "Patched Spark"
    assert patched["visual"]["effect_id"] == "none"
    assert patched["visual"]["scale"] == "large"
    assert patched["speed_tier"] == "fast"
    assert patched["transition_style"] == "pulse"


def test_patch_custom_glyph_rejects_glyph_id_change(tmp_path, monkeypatch) -> None:
    client = _client(tmp_path, monkeypatch)
    spec = build_fixture_glyph_spec(glyph_name="Stable Id")
    registered = client.post("/api/hails/composer/register-glyph", json=spec).json()
    glyph_id = registered["glyph_id"]

    r = client.patch(
        f"/api/hails/composer/custom-glyphs/{glyph_id}",
        json={"glyph_id": "custom-other"},
    )
    assert r.status_code == 422


def test_patch_unknown_custom_glyph_404(tmp_path, monkeypatch) -> None:
    client = _client(tmp_path, monkeypatch)
    r = client.patch("/api/hails/composer/custom-glyphs/custom-missing", json={"label": "Nope"})
    assert r.status_code == 404


def test_register_then_rename_via_domain(tmp_path, monkeypatch) -> None:
    from schemas import AxiomStoredSettings

    st = AxiomStoredSettings()
    spec = build_fixture_glyph_spec(glyph_name="Domain Rename")
    registered = register_custom_glyph(st, spec)
    glyph_id = registered["glyph_id"]
    renamed = patch_custom_glyph(st, glyph_id, {"label": "New Label"})
    assert renamed["glyph_id"] == glyph_id
    assert renamed["label"] == "New Label"

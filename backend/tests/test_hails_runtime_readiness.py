"""Static runtime readiness guards for Hails contract audit (#113)."""

from __future__ import annotations

import json
from pathlib import Path

from fastapi.testclient import TestClient

from hails.hail_effects_gallery import gallery_presets
from hails.hails_composer import build_fixture_glyph_spec
from hails.hails_render_contract import build_consumer_render_payload
from main import app
from settings import settings


def _client(tmp_path: Path, monkeypatch) -> TestClient:
    p = tmp_path / "axiom-settings.json"
    p.write_text(json.dumps({}), encoding="utf-8")
    monkeypatch.setattr(settings, "settings_path", p)
    return TestClient(app)


def _composer_create_body(glyph_id: str = "default", visual: dict | None = None) -> dict:
    return {
        "name": "Audit Composer Hail",
        "category": "cute",
        "enabled": True,
        "message": {"short_text": "Ready for proof preflight"},
        "icon": {"kind": "glyph", "value": glyph_id},
        "visual": visual
        or {
            "effect_id": "transporter",
            "scale": "medium",
            "palette_id": "axiom_dark_cyan",
            "duration_ms": 5000,
            "placement_id": "upper_center",
            "placement_mode": "preset",
        },
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
        "rooms": {"badge_policy": "source_room"},
        "behavior": {"cooldown_sec": 30, "requires_confirmation": False},
    }


def test_composer_create_persists_visual_and_delivery_shape(tmp_path, monkeypatch) -> None:
    """Composer-style create body should normalize to a proof-relevant hail record."""
    client = _client(tmp_path, monkeypatch)
    created = client.post("/api/hails", json=_composer_create_body()).json()

    assert created["name"] == "Audit Composer Hail"
    assert created["message"]["short_text"] == "Ready for proof preflight"
    assert created["icon"]["value"] == "default"
    assert created["enabled"] is True

    visual = created["visual"]
    assert visual["effect_id"] == "transporter"
    assert visual["scale"] == "medium"
    assert visual["palette_id"] == "axiom_dark_cyan"
    assert visual["duration_ms"] == 5000
    assert visual["placement_id"] == "upper_center"
    assert visual.get("anchor")  # backend default filled

    routes = created["delivery_policy"]["routes"]
    assert len(routes) == 1
    assert routes[0]["launch_room_id"] == "arcade"
    assert routes[0]["destination_room_id"] == "master_bedroom"
    assert routes[0]["enabled"] is True

    payload = build_consumer_render_payload(created)
    assert payload["effect_id"] == "transporter"
    assert payload["glyph_id"] == "default"
    assert payload["size_tier"] == "medium"


def test_effect_preset_visual_persists_on_save(tmp_path, monkeypatch) -> None:
    """Applying a deliverable Effect Preset should persist underlying visual fields on the hail record."""
    preset = next(p for p in gallery_presets() if p["id"] == "transporter-sweep")
    visual = {
        **preset["visual"],
        "placement_mode": "preset",
        "effect_variation_id": "voyaging",
    }

    client = _client(tmp_path, monkeypatch)
    created = client.post(
        "/api/hails",
        json=_composer_create_body(visual=visual),
    ).json()

    saved_visual = created["visual"]
    assert saved_visual["effect_id"] == visual["effect_id"]
    assert saved_visual["scale"] == visual["scale"]
    assert saved_visual["palette_id"] == visual["palette_id"]
    assert saved_visual["duration_ms"] == visual["duration_ms"]
    assert "effect_preset_id" not in created
    assert "presentation_style" not in created

    preview = client.post(
        "/api/hails/derive-preview",
        json={"hail_id": created["id"], "record": created},
    ).json()
    assert preview["validation"]["valid"] is True


def test_archived_custom_glyph_hail_still_derives_preview(tmp_path, monkeypatch) -> None:
    """Archived custom glyph references remain valid for validation and preview."""
    client = _client(tmp_path, monkeypatch)
    spec = build_fixture_glyph_spec(glyph_name="Audit Archive")
    registered = client.post("/api/hails/composer/register-glyph", json=spec).json()
    glyph_id = registered["glyph_id"]

    hail = client.post(
        "/api/hails",
        json=_composer_create_body(glyph_id=glyph_id, visual=registered["visual"]),
    ).json()

    archive = client.patch(
        f"/api/hails/composer/custom-glyphs/{glyph_id}",
        json={"archived": True},
    )
    assert archive.status_code == 200
    archived_body = archive.json()
    assert archived_body["glyph_id"] == glyph_id
    assert archived_body["archived"] is True

    listed = client.get("/api/hails").json()
    stored = next(g for g in listed["custom_glyphs"] if g["glyph_id"] == glyph_id)
    assert stored["archived"] is True

    preview = client.post(
        "/api/hails/derive-preview",
        json={"hail_id": hail["id"], "record": hail},
    ).json()
    assert preview["validation"]["valid"] is True
    assert glyph_id in preview["allowlists"]["glyphs"]

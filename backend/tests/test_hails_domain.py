"""First-class Hail domain: CRUD endpoints, migration, and effective bridge."""

from __future__ import annotations

import json
from pathlib import Path

from fastapi.testclient import TestClient

import settings as settings_module  # noqa: F401
from lcard_effective import effective_lcard_app_settings
from main import app
from settings import settings


def _client(tmp_path: Path, monkeypatch, initial: dict | None = None) -> TestClient:
    p = tmp_path / "axiom-settings.json"
    p.write_text(json.dumps(initial or {}), encoding="utf-8")
    monkeypatch.setattr(settings, "settings_path", p)
    return TestClient(app)


def _new_hail_body(**overrides) -> dict:
    body = {
        "name": "Dinner bell",
        "category": "summons",
        "message": {"short_text": "Dinner is ready."},
        "icon": {"kind": "glyph", "value": "default"},
        "visual": {
            "effect_id": "transporter",
            "effect_variation_id": "voyaging",
            "scale": "medium",
            "placement_id": "upper_center",
            "placement_mode": "preset",
            "palette_id": "axiom_dark_cyan",
            "duration_ms": 5000,
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
    }
    body.update(overrides)
    return body


def test_list_falls_back_to_seed(tmp_path, monkeypatch) -> None:
    c = _client(tmp_path, monkeypatch)
    r = c.get("/api/hails")
    assert r.status_code == 200
    data = r.json()
    assert data["source"] == "seed"
    assert any(h["id"] == "hail.spoon_transporter.001" for h in data["hails"])
    assert "arcade" in data["known_rooms"]
    assert "default" in data["known_glyphs"]


def test_list_prefers_legacy_app_settings(tmp_path, monkeypatch) -> None:
    legacy_hail = {
        "id": "hail.spoon_transporter.001",
        "display_id": "001",
        "name": "Legacy seed",
        "enabled": False,
        "icon": {"kind": "glyph", "value": "default"},
        "message": {"short_text": "Legacy"},
        "rooms": {
            "allowed_source_room_ids": ["arcade"],
            "allowed_target_room_ids": ["master_bedroom"],
        },
    }
    c = _client(tmp_path, monkeypatch, {"app_settings": {"lcard": {"hails": [legacy_hail]}}})
    data = c.get("/api/hails").json()
    assert data["source"] == "legacy-app-settings"
    assert data["hails"][0]["name"] == "Legacy seed"


def test_create_materializes_domain_and_generates_id(tmp_path, monkeypatch) -> None:
    c = _client(tmp_path, monkeypatch)
    r = c.post("/api/hails", json=_new_hail_body())
    assert r.status_code == 200
    created = r.json()
    assert created["id"].startswith("hail.dinner_bell.")
    assert created["enabled"] is True
    assert created["archived"] is False
    assert created["display_id"]
    assert created["message"]["variants"] == ["Dinner is ready."]

    data = c.get("/api/hails").json()
    assert data["source"] == "domain"
    ids = [h["id"] for h in data["hails"]]
    assert "hail.spoon_transporter.001" in ids  # seed migrated alongside the new record
    assert created["id"] in ids


def test_create_validation_errors_use_contract_shape(tmp_path, monkeypatch) -> None:
    c = _client(tmp_path, monkeypatch)
    r = c.post(
        "/api/hails",
        json={"name": "", "message": {"short_text": ""}, "rooms": {}},
    )
    assert r.status_code == 422
    errs = r.json()["detail"]["validation_errors"]
    paths = {e["path"] for e in errs}
    assert "/name" in paths
    assert "/message/short_text" in paths
    assert "/delivery_policy/routes" in paths


def test_create_rejects_unknown_glyph_and_category(tmp_path, monkeypatch) -> None:
    c = _client(tmp_path, monkeypatch)
    r = c.post(
        "/api/hails",
        json=_new_hail_body(category="party", icon={"kind": "glyph", "value": "missing-glyph"}),
    )
    assert r.status_code == 422
    paths = {e["path"] for e in r.json()["detail"]["validation_errors"]}
    assert "/category" in paths
    assert "/icon/value" in paths


def test_create_rejects_deprecated_registry_glyph(tmp_path, monkeypatch) -> None:
    c = _client(tmp_path, monkeypatch)
    r = c.post(
        "/api/hails",
        json=_new_hail_body(icon={"kind": "glyph", "value": "hail-beacon"}),
    )
    assert r.status_code == 422
    paths = {e["path"] for e in r.json()["detail"]["validation_errors"]}
    assert "/icon/value" in paths


def test_update_edits_fields_and_preserves_identity(tmp_path, monkeypatch) -> None:
    c = _client(tmp_path, monkeypatch)
    r = c.put(
        "/api/hails/hail.spoon_transporter.001",
        json={
            "enabled": False,
            "name": "Spoon prime",
            "message": {"short_text": "Updated sniff."},
            "delivery_policy": {
                "routes": [
                    {
                        "id": "route.master_bedroom.arcade.001",
                        "launch_room_id": "master_bedroom",
                        "destination_room_id": "arcade",
                        "provider": "lcard",
                        "requires_confirmation": False,
                        "enabled": True,
                    }
                ]
            },
        },
    )
    assert r.status_code == 200
    updated = r.json()
    assert updated["id"] == "hail.spoon_transporter.001"
    assert updated["enabled"] is False
    assert updated["name"] == "Spoon prime"
    assert updated["message"]["short_text"] == "Updated sniff."
    assert updated["delivery_policy"]["routes"][0]["launch_room_id"] == "master_bedroom"
    # untouched sections preserved from seed
    assert updated["visual"]["effect_id"] == "transporter"


def test_update_unknown_id_404(tmp_path, monkeypatch) -> None:
    c = _client(tmp_path, monkeypatch)
    r = c.put("/api/hails/hail.missing.001", json={"enabled": True})
    assert r.status_code == 404


def test_archive_marks_record_and_disables(tmp_path, monkeypatch) -> None:
    c = _client(tmp_path, monkeypatch)
    r = c.post("/api/hails/hail.spoon_transporter.001/archive")
    assert r.status_code == 200
    assert r.json()["hail"]["archived"] is True
    assert r.json()["hail"]["enabled"] is False

    data = c.get("/api/hails").json()
    assert data["source"] == "domain"
    record = next(h for h in data["hails"] if h["id"] == "hail.spoon_transporter.001")
    assert record["archived"] is True


def test_restore_recovers_archived_hail(tmp_path, monkeypatch) -> None:
    c = _client(tmp_path, monkeypatch)
    c.post("/api/hails/hail.spoon_transporter.001/archive")
    r = c.post("/api/hails/hail.spoon_transporter.001/restore")
    assert r.status_code == 200
    restored = r.json()["hail"]
    assert restored["archived"] is False
    assert restored["enabled"] is True


def test_delete_removes_record(tmp_path, monkeypatch) -> None:
    c = _client(tmp_path, monkeypatch)
    created = c.post("/api/hails", json=_new_hail_body()).json()
    hail_id = created["id"]
    r = c.delete(f"/api/hails/{hail_id}")
    assert r.status_code == 200
    assert r.json()["deleted_id"] == hail_id
    ids = [h["id"] for h in c.get("/api/hails").json()["hails"]]
    assert hail_id not in ids


def test_effective_lcard_uses_domain_and_excludes_archived(tmp_path, monkeypatch) -> None:
    c = _client(tmp_path, monkeypatch)
    c.post("/api/hails", json=_new_hail_body())
    c.post("/api/hails/hail.spoon_transporter.001/archive")

    hails = effective_lcard_app_settings()["hails"]
    ids = [h["id"] for h in hails]
    assert "hail.spoon_transporter.001" not in ids  # archived excluded
    assert any(i.startswith("hail.dinner_bell.") for i in ids)


def test_delete_all_materialized_catalog_stays_empty(tmp_path, monkeypatch) -> None:
    c = _client(tmp_path, monkeypatch)
    listed = c.get("/api/hails").json()["hails"]
    for hail in listed:
        c.delete(f"/api/hails/{hail['id']}")
    r = c.get("/api/hails")
    assert r.status_code == 200
    body = r.json()
    assert body["hails"] == []
    assert body["source"] == "domain"
    eff = effective_lcard_app_settings()["hails"]
    assert eff == []
    assert "hail.spoon_transporter.001" not in [h["id"] for h in eff]


def test_effective_lcard_falls_back_to_seed_when_domain_empty(tmp_path, monkeypatch) -> None:
    c = _client(tmp_path, monkeypatch)
    hails = effective_lcard_app_settings()["hails"]
    assert any(h["id"] == "hail.spoon_transporter.001" for h in hails)
    seed = next(h for h in hails if h["id"] == "hail.spoon_transporter.001")
    assert "effective_by_launch_room" in seed["delivery_policy"]
    arcade_effective = seed["delivery_policy"]["effective_by_launch_room"]["arcade"]
    assert arcade_effective["configured_target"] is None
    dest_ids = {r["destination_room_id"] for r in arcade_effective["routes"]}
    assert dest_ids == {"master_bedroom", "away_team"}


def test_effective_payload_omits_provider_details(tmp_path, monkeypatch) -> None:
    c = _client(tmp_path, monkeypatch)
    c.post("/api/hails", json=_new_hail_body())
    payload = json.dumps(effective_lcard_app_settings()["hails"])
    for needle in ("entity_id", "script.", "tvoverlay", "192.168."):
        assert needle not in payload


# Note: the "PATCH /api/apps/lcard/settings rejects a hails body" guard is an
# Axiom hub app-settings surface, not a Proscenium route; it stays covered by
# Axiom's test_app_settings_schema.py.


def test_create_rejects_non_boolean_enabled(tmp_path, monkeypatch) -> None:
    c = _client(tmp_path, monkeypatch)
    r = c.post("/api/hails", json=_new_hail_body(enabled="false"))
    assert r.status_code == 422
    paths = {e["path"] for e in r.json()["detail"]["validation_errors"]}
    assert "/enabled" in paths


def test_create_rejects_non_boolean_archived(tmp_path, monkeypatch) -> None:
    c = _client(tmp_path, monkeypatch)
    r = c.post("/api/hails", json=_new_hail_body(archived="true"))
    assert r.status_code == 422
    paths = {e["path"] for e in r.json()["detail"]["validation_errors"]}
    assert "/archived" in paths


def test_update_rejects_non_boolean_enabled(tmp_path, monkeypatch) -> None:
    c = _client(tmp_path, monkeypatch)
    c.post("/api/hails", json=_new_hail_body())
    r = c.put("/api/hails/hail.spoon_transporter.001", json={"enabled": "false"})
    assert r.status_code == 422
    paths = {e["path"] for e in r.json()["detail"]["validation_errors"]}
    assert "/enabled" in paths


def test_update_rejects_non_boolean_archived(tmp_path, monkeypatch) -> None:
    c = _client(tmp_path, monkeypatch)
    c.post("/api/hails", json=_new_hail_body())
    r = c.put("/api/hails/hail.spoon_transporter.001", json={"archived": "true"})
    assert r.status_code == 422
    paths = {e["path"] for e in r.json()["detail"]["validation_errors"]}
    assert "/archived" in paths


def test_update_rejects_invalid_placement_id(tmp_path, monkeypatch) -> None:
    c = _client(tmp_path, monkeypatch)
    c.post("/api/hails", json=_new_hail_body())
    r = c.put(
        "/api/hails/hail.spoon_transporter.001",
        json={"visual": {"placement_id": "offscreen_corner", "placement_mode": "preset"}},
    )
    assert r.status_code == 422
    paths = {e["path"] for e in r.json()["detail"]["validation_errors"]}
    assert "/visual/placement_id" in paths


def test_create_persists_normalized_effect_tuning(tmp_path, monkeypatch) -> None:
    c = _client(tmp_path, monkeypatch)
    r = c.post(
        "/api/hails",
        json=_new_hail_body(
            visual={
                "effect_id": "transporter",
                "effect_tuning": {"beam_intensity": 0.9, "beam_shape": "shimmer"},
            }
        ),
    )
    assert r.status_code == 200
    visual = r.json()["visual"]
    assert visual["effect_tuning"]["beam_intensity"] == 0.9
    assert visual["effect_tuning"]["beam_shape"] == "shimmer"
    assert "beam_scale" in visual["effect_tuning"]
    assert visual["effect_variation_id"] == "voyaging"


def test_create_defaults_transporter_variation_and_accepts_spoon(tmp_path, monkeypatch) -> None:
    c = _client(tmp_path, monkeypatch)
    r = c.post(
        "/api/hails",
        json=_new_hail_body(visual={"effect_id": "transporter", "effect_variation_id": "spoon"}),
    )
    assert r.status_code == 200
    visual = r.json()["visual"]
    assert visual["effect_variation_id"] == "spoon"


def test_create_normalizes_deprecated_variation_palette_ids(tmp_path, monkeypatch) -> None:
    c = _client(tmp_path, monkeypatch)
    r = c.post(
        "/api/hails",
        json=_new_hail_body(visual={"effect_id": "transporter", "palette_id": "transporter_spoon"}),
    )
    assert r.status_code == 200
    assert r.json()["visual"]["palette_id"] == "transporter_white"


def test_create_rejects_invalid_effect_variation(tmp_path, monkeypatch) -> None:
    c = _client(tmp_path, monkeypatch)
    r = c.post(
        "/api/hails",
        json=_new_hail_body(visual={"effect_id": "transporter", "effect_variation_id": "romulan"}),
    )
    assert r.status_code == 422
    paths = {e["path"] for e in r.json()["detail"]["validation_errors"]}
    assert "/visual/effect_variation_id" in paths


def test_create_rejects_invalid_effect_tuning(tmp_path, monkeypatch) -> None:
    c = _client(tmp_path, monkeypatch)
    r = c.post(
        "/api/hails",
        json=_new_hail_body(visual={"effect_id": "transporter", "effect_tuning": {"beam_intensity": 9.0}}),
    )
    assert r.status_code == 422
    paths = {e["path"] for e in r.json()["detail"]["validation_errors"]}
    assert "/visual/effect_tuning/beam_intensity" in paths

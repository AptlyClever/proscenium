"""Hails delivery_policy.routes[] persistence and validation."""

from __future__ import annotations

import json
from pathlib import Path

from fastapi.testclient import TestClient

from lcard_effective import effective_lcard_app_settings
from main import app
from settings import settings


def _client(tmp_path: Path, monkeypatch, initial: dict | None = None) -> TestClient:
    p = tmp_path / "axiom-settings.json"
    p.write_text(json.dumps(initial or {}), encoding="utf-8")
    monkeypatch.setattr(settings, "settings_path", p)
    return TestClient(app)


def _route(launch: str = "arcade", destination: str = "master_bedroom", **overrides) -> dict:
    row = {
        "id": f"route.{launch}.{destination}.001",
        "launch_room_id": launch,
        "destination_room_id": destination,
        "provider": "lcard",
        "requires_confirmation": False,
        "enabled": True,
    }
    row.update(overrides)
    return row


def _new_hail_body(**overrides) -> dict:
    body = {
        "name": "Dinner bell",
        "category": "summons",
        "message": {"short_text": "Dinner is ready."},
        "icon": {"kind": "glyph", "value": "default"},
        "delivery_policy": {"routes": [_route()]},
    }
    body.update(overrides)
    return body


def test_list_seed_seed_hail_returns_canonical_route(tmp_path, monkeypatch) -> None:
    c = _client(tmp_path, monkeypatch)
    data = c.get("/api/hails").json()
    seed = next(h for h in data["hails"] if h["id"] == "hail.spoon_transporter.001")
    routes = seed["delivery_policy"]["routes"]
    assert len(routes) == 2
    assert routes[0]["launch_room_id"] == "arcade"
    assert routes[0]["destination_room_id"] == "master_bedroom"
    assert routes[1]["launch_room_id"] == "arcade"
    assert routes[1]["destination_room_id"] == "away_team"
    assert not any(
        r["launch_room_id"] == "master_bedroom" and r["destination_room_id"] == "arcade" for r in routes
    )


def test_create_persists_delivery_policy_routes(tmp_path, monkeypatch) -> None:
    c = _client(tmp_path, monkeypatch)
    r = c.post("/api/hails", json=_new_hail_body())
    assert r.status_code == 200
    created = r.json()
    assert created["delivery_policy"]["routes"][0]["launch_room_id"] == "arcade"

    stored = json.loads((tmp_path / "axiom-settings.json").read_text(encoding="utf-8"))
    saved = next(h for h in stored["hails"] if h["id"] == created["id"])
    assert saved["delivery_policy"]["routes"][0]["destination_room_id"] == "master_bedroom"


def test_update_persists_delivery_policy_routes(tmp_path, monkeypatch) -> None:
    c = _client(tmp_path, monkeypatch)
    c.post("/api/hails", json=_new_hail_body())
    r = c.put(
        "/api/hails/hail.spoon_transporter.001",
        json={
            "delivery_policy": {
                "routes": [
                    _route("master_bedroom", "arcade"),
                ]
            }
        },
    )
    assert r.status_code == 200
    routes = r.json()["delivery_policy"]["routes"]
    assert len(routes) == 1
    assert routes[0]["launch_room_id"] == "master_bedroom"


def test_rejects_list_only_legacy_policy_write(tmp_path, monkeypatch) -> None:
    c = _client(tmp_path, monkeypatch)
    r = c.post(
        "/api/hails",
        json={
            "name": "Legacy write",
            "message": {"short_text": "Hi"},
            "icon": {"kind": "glyph", "value": "default"},
            "rooms": {
                "allowed_source_room_ids": ["arcade"],
                "allowed_target_room_ids": ["master_bedroom"],
            },
        },
    )
    assert r.status_code == 422
    paths = {e["path"] for e in r.json()["detail"]["validation_errors"]}
    assert "/delivery_policy/routes" in paths


def test_accepts_same_room_route(tmp_path, monkeypatch) -> None:
    c = _client(tmp_path, monkeypatch)
    r = c.post("/api/hails", json=_new_hail_body(delivery_policy={"routes": [_route("arcade", "arcade")]}))
    assert r.status_code == 200
    route = r.json()["delivery_policy"]["routes"][0]
    assert route["launch_room_id"] == "arcade"
    assert route["destination_room_id"] == "arcade"
    assert route["id"] == "route.arcade.arcade.001"


def test_rejects_unknown_launch_room(tmp_path, monkeypatch) -> None:
    c = _client(tmp_path, monkeypatch)
    r = c.post(
        "/api/hails",
        json=_new_hail_body(delivery_policy={"routes": [_route("kitchen", "master_bedroom")]}),
    )
    assert r.status_code == 422
    assert any("launch room" in e["message"] for e in r.json()["detail"]["validation_errors"])


def test_rejects_unknown_destination_room(tmp_path, monkeypatch) -> None:
    c = _client(tmp_path, monkeypatch)
    r = c.post(
        "/api/hails",
        json=_new_hail_body(delivery_policy={"routes": [_route("arcade", "kitchen")]}),
    )
    assert r.status_code == 422
    assert any("destination room" in e["message"] for e in r.json()["detail"]["validation_errors"])


def test_rejects_unsupported_provider(tmp_path, monkeypatch) -> None:
    c = _client(tmp_path, monkeypatch)
    r = c.post(
        "/api/hails",
        json=_new_hail_body(delivery_policy={"routes": [_route(provider="mqtt")]}),
    )
    assert r.status_code == 422
    assert any("unsupported provider" in e["message"] for e in r.json()["detail"]["validation_errors"])


def test_rejects_duplicate_enabled_routes(tmp_path, monkeypatch) -> None:
    c = _client(tmp_path, monkeypatch)
    duplicate = _route()
    r = c.post(
        "/api/hails",
        json=_new_hail_body(delivery_policy={"routes": [duplicate, dict(duplicate)]}),
    )
    assert r.status_code == 422
    assert any("duplicate enabled route" in e["message"] for e in r.json()["detail"]["validation_errors"])


def test_rejects_enabled_hail_without_active_route(tmp_path, monkeypatch) -> None:
    c = _client(tmp_path, monkeypatch)
    r = c.post(
        "/api/hails",
        json=_new_hail_body(delivery_policy={"routes": [_route(enabled=False)]}),
    )
    assert r.status_code == 422
    assert any("at least one enabled route" in e["message"] for e in r.json()["detail"]["validation_errors"])


def test_effective_lcard_uses_explicit_routes(tmp_path, monkeypatch) -> None:
    c = _client(tmp_path, monkeypatch)
    c.post("/api/hails", json=_new_hail_body())
    payload = effective_lcard_app_settings()["hails"]
    created = next(h for h in payload if h["id"].startswith("hail.dinner_bell."))
    routes = created["delivery_policy"]["routes"]
    assert len(routes) == 1
    assert "effective_by_launch_room" in created["delivery_policy"]
    assert created["delivery_policy"]["effective_by_launch_room"]["arcade"]["configured_target"]["id"] == "master_bedroom"


def test_no_implicit_reciprocal_route_on_seed_hail_read(tmp_path, monkeypatch) -> None:
    c = _client(tmp_path, monkeypatch)
    seed = next(h for h in c.get("/api/hails").json()["hails"] if h["id"] == "hail.spoon_transporter.001")
    enabled = [r for r in seed["delivery_policy"]["routes"] if r.get("enabled") is not False]
    pairs = {(r["launch_room_id"], r["destination_room_id"]) for r in enabled}
    assert ("arcade", "master_bedroom") in pairs
    assert ("master_bedroom", "arcade") not in pairs


def test_legacy_list_only_hail_has_no_derived_routes_on_read(tmp_path, monkeypatch) -> None:
    legacy_hail = {
        "id": "hail.spoon_transporter.001",
        "display_id": "001",
        "name": "Legacy seed",
        "enabled": True,
        "icon": {"kind": "glyph", "value": "default"},
        "message": {"short_text": "Legacy"},
        "rooms": {
            "allowed_source_room_ids": ["arcade", "master_bedroom"],
            "allowed_target_room_ids": ["arcade", "master_bedroom"],
        },
    }
    c = _client(tmp_path, monkeypatch, {"app_settings": {"lcard": {"hails": [legacy_hail]}}})
    seed = c.get("/api/hails").json()["hails"][0]
    assert seed["delivery_policy"]["routes"] == []


def test_normalizes_mismatched_route_id_on_create(tmp_path, monkeypatch) -> None:
    c = _client(tmp_path, monkeypatch)
    stale = _route("master_bedroom", "arcade", id="route.arcade.master_bedroom.001")
    r = c.post("/api/hails", json=_new_hail_body(delivery_policy={"routes": [stale]}))
    assert r.status_code == 200
    route = r.json()["delivery_policy"]["routes"][0]
    assert route["launch_room_id"] == "master_bedroom"
    assert route["destination_room_id"] == "arcade"
    assert route["id"] == "route.master_bedroom.arcade.001"


def test_normalizes_mismatched_route_id_on_update(tmp_path, monkeypatch) -> None:
    c = _client(tmp_path, monkeypatch)
    c.post("/api/hails", json=_new_hail_body())
    stale = _route("master_bedroom", "arcade", id="route.arcade.master_bedroom.001")
    r = c.put("/api/hails/hail.spoon_transporter.001", json={"delivery_policy": {"routes": [stale]}})
    assert r.status_code == 200
    route = r.json()["delivery_policy"]["routes"][0]
    assert route["id"] == "route.master_bedroom.arcade.001"

    payload = effective_lcard_app_settings()["hails"]
    updated = next(h for h in payload if h["id"] == "hail.spoon_transporter.001")
    effective = updated["delivery_policy"]["effective_by_launch_room"]["master_bedroom"]
    assert effective["configured_target"]["route_id"] == "route.master_bedroom.arcade.001"

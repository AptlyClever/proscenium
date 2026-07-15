"""API test for Axiom-owned hail send."""

from __future__ import annotations

import json
from pathlib import Path
from unittest.mock import MagicMock

from fastapi.testclient import TestClient

from hails.hail_delivery import reset_delivery_state_for_tests
from main import app
from settings import settings


def _client(tmp_path: Path, monkeypatch) -> TestClient:
    p = tmp_path / "axiom-settings.json"
    p.write_text(json.dumps({}), encoding="utf-8")
    monkeypatch.setattr(settings, "settings_path", p)
    reset_delivery_state_for_tests()
    return TestClient(app)


def test_send_hail_endpoint_posts_overlay(tmp_path, monkeypatch) -> None:
    monkeypatch.setenv("AXIOM_HAIL_DELIVERY_BROKER_SECRET", "test-secret-16chars")
    client = _client(tmp_path, monkeypatch)
    created = client.post(
        "/api/hails",
        json={
            "name": "Send me",
            "message": {"short_text": "Hello TV"},
            "icon": {"value": "default"},
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
                        "id": "route.arcade.master_bedroom.send",
                        "launch_room_id": "arcade",
                        "destination_room_id": "master_bedroom",
                        "provider": "lcard",
                        "enabled": True,
                    }
                ]
            },
        },
    )
    assert created.status_code == 200
    hail_id = created.json()["id"]
    assert created.json()["hail_package"]["catalog_ready"] is True

    import urllib.request

    def fake_urlopen(request, timeout=0):
        response = MagicMock()
        response.__enter__ = lambda self: self
        response.__exit__ = lambda *args: None
        response.status = 200
        response.getcode = lambda: 200
        return response

    monkeypatch.setattr(urllib.request, "urlopen", fake_urlopen)
    sent = client.post(f"/api/hails/{hail_id}/send", json={"source": "lcard"})
    assert sent.status_code == 200
    body = sent.json()
    assert body["ok"] is True
    assert body["code"] == "HAIL_SENT"

"""Product-neutral Proscenium delivery tests."""

from __future__ import annotations

import asyncio
import io
import json
from unittest.mock import MagicMock

import pytest

from presentation import delivery
from routers import presentation


def _registry() -> dict:
    return {
        "schema_version": 1,
        "default_target_id": "arcade",
        "targets": {
            "arcade": {
                "label": "Arcade",
                "display_class": "projector",
                "products": {
                    "hails": {
                        "renderer": "hail_overlay",
                        "base_url": "http://tv:8765",
                        "show_path": "/hail/show",
                    },
                    "bandit": {
                        "renderer": "bandit_webview",
                        "base_url": "http://tv:8767",
                        "show_path": "/bandit/show",
                        "dismiss_path": "/bandit/dismiss",
                        "default_payload": {"ws_url": "ws://bandit/stream"},
                    },
                },
            }
        },
    }


def test_product_capabilities_hide_device_urls(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(delivery, "load_delivery_registry", _registry)
    result = delivery.product_capabilities()
    bandit = result["targets"]["arcade"]["products"]["bandit"]
    assert bandit == {
        "renderer": "bandit_webview",
        "actions": ["show", "dismiss"],
    }
    assert "base_url" not in json.dumps(result)


def test_bandit_show_posts_dynamic_adapter_payload(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(delivery, "load_delivery_registry", _registry)
    captured: dict = {}

    def fake_urlopen(request, timeout=0):
        captured["url"] = request.full_url
        captured["body"] = json.loads(request.data.decode())
        response = MagicMock()
        response.__enter__ = lambda self: self
        response.__exit__ = lambda *args: None
        response.status = 200
        response.getcode = lambda: 200
        response.read = lambda: b'{"status":"shown"}'
        return response

    result = delivery.deliver_product_action(
        "bandit",
        "show",
        payload={
            "ws_url": "ws://override/stream",
            "game_id": "factory_prove_hold_001",
        },
        urlopen=fake_urlopen,
    )
    assert captured["url"] == "http://tv:8767/bandit/show"
    assert captured["body"]["ws_url"] == "ws://override/stream"
    assert captured["body"]["game_id"] == "factory_prove_hold_001"
    assert captured["body"]["product_id"] == "bandit"
    assert result["renderer"] == "bandit_webview"


def test_unconfigured_product_target_is_rejected(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(delivery, "load_delivery_registry", _registry)
    with pytest.raises(KeyError, match="presentation_target_not_configured"):
        delivery.deliver_product_action("bandit", "show", delivery_target_id="away_team")


def test_unsupported_action_is_rejected() -> None:
    with pytest.raises(ValueError, match="unsupported_presentation_action"):
        delivery.deliver_product_action("bandit", "explode")


def test_route_forwards_machine_selection_to_adapter(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    captured: dict = {}

    def fake_deliver(product_id, action, **kwargs):
        captured.update({"product_id": product_id, "action": action, **kwargs})
        return {"ok": True}

    monkeypatch.setattr(presentation, "deliver_product_action", fake_deliver)
    result = asyncio.run(
        presentation.post_product_delivery_action(
            "bandit",
            "show",
            {
                "delivery_target_id": "arcade",
                "game_id": "factory_prove_hold_001",
            },
        )
    )

    assert result == {"ok": True}
    assert captured["payload"]["game_id"] == "factory_prove_hold_001"

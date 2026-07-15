"""Tests for Axiom-owned hail delivery."""

from __future__ import annotations

import io
import json
from unittest.mock import MagicMock

import pytest

from hails.hail_delivery import (
    attach_broker_proof,
    lifecycle_cleared_ms,
    reset_delivery_state_for_tests,
    send_hail_package,
)


def _payload(**overrides):
    base = {
        "hail_id": "hail.beta.001",
        "catalog_ready": True,
        "effect_id": "transporter",
        "glyph_id": "default",
        "palette_id": "axiom_dark_cyan",
        "message": "Hello",
        "duration_ms": 5000,
        "placement_id": "upper_center",
        "placement_mode": "preset",
        "size_tier": "medium",
        "lifecycle_timing": {
            "entrance_animation_ms": 100,
            "stable_hold_ms": 200,
            "exit_animation_ms": 100,
            "total_timed_lifecycle_ms": 400,
        },
    }
    base.update(overrides)
    return base


@pytest.fixture(autouse=True)
def _reset_delivery() -> None:
    reset_delivery_state_for_tests()
    yield
    reset_delivery_state_for_tests()


def test_broker_proof_requires_secret(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("AXIOM_HAIL_DELIVERY_BROKER_SECRET", raising=False)
    monkeypatch.delenv("LCARD_OVERLAY_BROKER_SECRET", raising=False)
    with pytest.raises(ValueError):
        attach_broker_proof(_payload())


def test_broker_proof_attaches_hmac(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AXIOM_HAIL_DELIVERY_BROKER_SECRET", "test-secret-16chars")
    body = attach_broker_proof(_payload())
    assert isinstance(body.get("broker_proof"), str)
    assert len(body["broker_proof"]) == 64


def test_broker_proof_resolves_variation_palette(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AXIOM_HAIL_DELIVERY_BROKER_SECRET", "test-secret-16chars")
    body = attach_broker_proof(
        _payload(
            palette_id="axiom_dark_cyan",
            effect_variation_id="voyaging",
        )
    )
    assert body["palette_id"] == "transporter_white"
    assert body["broker_proof"]


def test_broker_proof_resolves_variation_palette_from_collapsed_white(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("AXIOM_HAIL_DELIVERY_BROKER_SECRET", "test-secret-16chars")
    spoon = attach_broker_proof(
        _payload(
            palette_id="transporter_white",
            effect_variation_id="spoon",
        )
    )
    assert spoon["palette_id"] == "transporter_spoon"
    tng = attach_broker_proof(
        _payload(
            palette_id="transporter_white",
            effect_variation_id="generation-next",
        )
    )
    assert tng["palette_id"] == "transporter_generation_next"


def test_broker_proof_preserves_explicit_operator_palette(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("AXIOM_HAIL_DELIVERY_BROKER_SECRET", "test-secret-16chars")
    body = attach_broker_proof(
        _payload(
            palette_id="cute_purple",
            effect_variation_id="spoon",
        )
    )
    assert body["palette_id"] == "cute_purple"


def test_send_rejects_not_catalog_ready() -> None:
    result = send_hail_package(_payload(catalog_ready=False), skip_cooldown=True)
    assert result["ok"] is False
    assert result["code"] == "HAIL_NOT_CATALOG_READY"


def test_send_posts_overlay(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AXIOM_HAIL_DELIVERY_BROKER_SECRET", "test-secret-16chars")

    def fake_urlopen(request, timeout=0):
        assert request.get_method() == "POST"
        body = json.loads(request.data.decode("utf-8"))
        assert body["hail_id"] == "hail.beta.001"
        assert body["broker_proof"]
        response = MagicMock()
        response.__enter__ = lambda self: self
        response.__exit__ = lambda *args: None
        response.status = 200
        response.getcode = lambda: 200
        return response

    result = send_hail_package(_payload(), skip_cooldown=True, urlopen=fake_urlopen)
    assert result["ok"] is True
    assert result["code"] == "HAIL_SENT"
    assert result["lifecycle_cleared_ms"] == lifecycle_cleared_ms(_payload())

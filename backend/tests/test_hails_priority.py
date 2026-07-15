"""Tests for Hail priority bands and deferred room routing."""

from __future__ import annotations

from hails.hails_priority import (
    apply_priority_destination_bias,
    normalize_priority_level,
    priority_applies_room_bias,
    resolve_destination_room_from_name,
)


def _sample_hail(**overrides) -> dict:
    hail = {
        "id": "hail.test.001",
        "name": "Dinner ping",
        "enabled": True,
        "visual": {"priority_level": "green"},
        "delivery_policy": {
            "routes": [
                {
                    "id": "route.arcade.master_bedroom.001",
                    "launch_room_id": "arcade",
                    "destination_room_id": "master_bedroom",
                    "provider": "lcard",
                    "enabled": True,
                }
            ]
        },
    }
    hail.update(overrides)
    return hail


def test_normalize_priority_defaults_green() -> None:
    assert normalize_priority_level(None) == "green"
    assert normalize_priority_level("yellow") == "yellow"
    assert normalize_priority_level("RED") == "red"
    assert normalize_priority_level("blue") == "green"


def test_resolve_room_from_name_only() -> None:
    assert resolve_destination_room_from_name("Arcade check-in") == "arcade"
    assert resolve_destination_room_from_name("Master Bedroom door") == "master_bedroom"
    assert resolve_destination_room_from_name("Away Team ping") == "away_team"
    assert resolve_destination_room_from_name("Dinner!") is None


def test_apply_bias_is_noop_in_v1() -> None:
    hail = apply_priority_destination_bias(
        _sample_hail(name="Arcade ping", visual={"priority_level": "yellow"}),
    )
    assert hail["delivery_policy"]["routes"][0]["destination_room_id"] == "master_bedroom"
    assert "delivery_policy_meta" not in hail


def test_message_not_used_for_bias() -> None:
    hail = _sample_hail(
        name="Quick ping",
        message={"short_text": "Come to Arcade"},
        visual={"priority_level": "red"},
    )
    hail = apply_priority_destination_bias(hail)
    assert hail["delivery_policy"]["routes"][0]["destination_room_id"] == "master_bedroom"


def test_priority_room_bias_deferred() -> None:
    assert priority_applies_room_bias("yellow") is False
    assert priority_applies_room_bias("green") is False

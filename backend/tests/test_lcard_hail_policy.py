"""LCARD hail policy sanitization tests."""

from __future__ import annotations

import copy

import pytest

from lcard_hail_policy import sanitize_lcard_hails_for_store
from lcard_hail_seed import load_lcard_hail_seed


def _all_seed_hails() -> list[dict]:
    return copy.deepcopy(load_lcard_hail_seed())


def _seed_hail_edit(**overrides: object) -> dict:
    seed = next(h for h in load_lcard_hail_seed() if h.get("id") == "hail.spoon_transporter.001")
    hail = dict(seed)
    hail["rooms"] = dict(hail["rooms"])
    hail.update(overrides)
    return hail


def _seed_with_seed_hail_edit(**overrides: object) -> list[dict]:
    hails = _all_seed_hails()
    for index, hail in enumerate(hails):
        if hail.get("id") == "hail.spoon_transporter.001":
            hail["rooms"] = dict(hail["rooms"])
            hail.update(overrides)
            hails[index] = hail
            break
    return hails


def _seed_hail_from_result(result: list[dict]) -> dict:
    return next(h for h in result if h.get("id") == "hail.spoon_transporter.001")


def test_sanitize_preserves_baseline_identity_and_enabled() -> None:
    result = sanitize_lcard_hails_for_store(_seed_with_seed_hail_edit(enabled=False))
    assert len(result) == len(load_lcard_hail_seed())
    hail = _seed_hail_from_result(result)
    assert hail["enabled"] is False
    assert hail["message"]["short_text"] == "Spoon transporter check"
    assert hail["icon"]["value"] == "custom-spoon-transporter"


def test_sanitize_updates_room_policy() -> None:
    result = sanitize_lcard_hails_for_store(
        _seed_with_seed_hail_edit(
            rooms={
                "allowed_source_room_ids": ["arcade"],
                "allowed_target_room_ids": ["master_bedroom"],
            }
        )
    )
    rooms = _seed_hail_from_result(result)["rooms"]
    assert rooms["allowed_source_room_ids"] == ["arcade"]
    assert rooms["allowed_target_room_ids"] == ["master_bedroom"]


def test_sanitize_accepts_away_team_target() -> None:
    result = sanitize_lcard_hails_for_store(
        _seed_with_seed_hail_edit(
            rooms={
                "allowed_source_room_ids": ["arcade"],
                "allowed_target_room_ids": ["away_team"],
            }
        )
    )
    rooms = _seed_hail_from_result(result)["rooms"]
    assert rooms["allowed_target_room_ids"] == ["away_team"]


def test_sanitize_rejects_unknown_room_ids() -> None:
    result = sanitize_lcard_hails_for_store(
        _seed_with_seed_hail_edit(
            rooms={
                "allowed_source_room_ids": ["arcade", "not_a_room"],
                "allowed_target_room_ids": ["master_bedroom"],
            }
        )
    )
    assert _seed_hail_from_result(result)["rooms"]["allowed_source_room_ids"] == ["arcade"]


def test_sanitize_rejects_create_delete() -> None:
    with pytest.raises(ValueError, match="create/delete"):
        sanitize_lcard_hails_for_store([])
    with pytest.raises(ValueError, match="unknown hail id"):
        sanitize_lcard_hails_for_store([{"id": "hail.new.001", "enabled": True, "rooms": {}}])


def test_sanitize_requires_known_source_and_target() -> None:
    with pytest.raises(ValueError, match="at least one known source and target room"):
        sanitize_lcard_hails_for_store(
            _seed_with_seed_hail_edit(
                rooms={
                    "allowed_source_room_ids": [],
                    "allowed_target_room_ids": ["master_bedroom"],
                }
            )
        )


def test_sanitize_defaults_enabled_true() -> None:
    hails = _seed_with_seed_hail_edit()
    for hail in hails:
        if hail.get("id") == "hail.spoon_transporter.001":
            hail.pop("enabled", None)
            break
    result = sanitize_lcard_hails_for_store(hails)
    assert _seed_hail_from_result(result)["enabled"] is True


def test_sanitize_merges_from_previous_hails() -> None:
    previous = [_seed_hail_edit(enabled=True)]
    edited = {
        "id": "hail.spoon_transporter.001",
        "enabled": False,
        "rooms": {
            "allowed_source_room_ids": ["master_bedroom"],
            "allowed_target_room_ids": ["arcade"],
        },
    }
    result = sanitize_lcard_hails_for_store([edited], previous_hails=previous)
    assert result[0]["enabled"] is False
    assert result[0]["name"] == "Spoon transporter test"

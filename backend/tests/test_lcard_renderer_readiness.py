"""LCARD hail renderer readiness metadata tests (issue #87)."""

from __future__ import annotations

import json
from pathlib import Path

from lcard_hail_seed import load_lcard_hail_seed


def _repo_root() -> Path:
    return Path(__file__).resolve().parent.parent.parent


def _load_renderer_readiness() -> dict:
    path = _repo_root() / "config" / "lcard" / "hail-renderer-readiness.json"
    with path.open(encoding="utf-8") as fh:
        return json.load(fh)


def test_renderer_readiness_covers_all_seed_hails() -> None:
    readiness = _load_renderer_readiness()
    seed_ids = {h["id"] for h in load_lcard_hail_seed()}
    assert seed_ids <= set(readiness.keys())


def test_renderer_readiness_uses_hail_overlay_only() -> None:
    readiness = _load_renderer_readiness()
    for hail_id, entry in readiness.items():
        assert entry["primary_renderer"] == "hail_overlay"
        assert "fallback_renderer" not in entry
        serialized = json.dumps(entry).lower()
        assert "tvoverlay_toast" not in serialized, f"{hail_id} must not reference TvOverlay fallback"


def test_spoon_transporter_readiness_includes_fleet_rooms() -> None:
    entry = _load_renderer_readiness()["hail.spoon_transporter.001"]
    rooms = entry["rooms"]
    assert set(rooms.keys()) == {"arcade", "master_bedroom", "away_team"}
    assert all(room["overlay_ready"] is True for room in rooms.values())

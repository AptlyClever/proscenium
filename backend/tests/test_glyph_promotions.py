"""Tests for workbench candidate promotion to staged runtime bindings."""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from hails.glyph_generation_workbench import accept_workbench_candidate, brief_from_registry_glyph, update_workbench_candidate
from hails.glyph_promotions import PromotionValidationError, promote_workbench_candidate
from main import app
from settings import settings


def _staged_slot(**overrides) -> dict:
    base = {
        "candidate_id": "candidate-default-001",
        "status": "staged",
        "asset_ref": "staged/glyphs/default/example-v001.svg",
        "asset_kind": "svg",
        "source": "manual_import",
        "notes": "Example staged asset",
    }
    base.update(overrides)
    return base


def _client(tmp_path: Path, monkeypatch) -> TestClient:
    p = tmp_path / "axiom-settings.json"
    p.write_text(json.dumps({}), encoding="utf-8")
    monkeypatch.setattr(settings, "settings_path", p)
    return TestClient(app)


def test_promote_requires_accepted_candidate() -> None:
    brief = brief_from_registry_glyph("default", brief_id="brief-promote-test")
    candidate_id = brief["candidate_slots"][0]["candidate_id"]
    brief["candidate_slots"][0] = _staged_slot(candidate_id=candidate_id, status="staged")
    with pytest.raises(PromotionValidationError):
        promote_workbench_candidate("brief-promote-test", candidate_id, [brief])


def test_promote_accepted_candidate_updates_brief_and_promotion_record() -> None:
    brief = brief_from_registry_glyph("default", brief_id="brief-promote-ok")
    candidate_id = brief["candidate_slots"][0]["candidate_id"]
    brief["candidate_slots"][0] = _staged_slot(candidate_id=candidate_id, status="staged")
    accepted = accept_workbench_candidate("brief-promote-ok", candidate_id, [brief])
    updated, promotion = promote_workbench_candidate("brief-promote-ok", candidate_id, [accepted])
    assert updated["status"] == "promoted"
    assert updated["promotion_target"]["asset_ref"] == "staged/glyphs/default/example-v001.svg"
    assert promotion["glyph_id"] == "default"
    assert promotion["preview_url"] == "/staged/glyphs/default/example-v001.svg"


def test_api_promote_persists_staged_promotions(tmp_path, monkeypatch) -> None:
    client = _client(tmp_path, monkeypatch)
    brief_id = "brief-default-v001"
    candidate_id = "candidate-default-001"
    client.put(
        f"/api/hails/glyph-generation-workbench/briefs/{brief_id}/candidates/{candidate_id}",
        json=_staged_slot(candidate_id=candidate_id),
    )
    client.post(
        f"/api/hails/glyph-generation-workbench/briefs/{brief_id}/candidates/{candidate_id}/accept",
        json={"notes": "Approved for promotion"},
    )
    r = client.post(
        f"/api/hails/glyph-generation-workbench/briefs/{brief_id}/candidates/{candidate_id}/promote",
    )
    assert r.status_code == 200
    body = r.json()
    assert body["promotion"]["glyph_id"] == "default"
    assert body["brief"]["status"] == "promoted"

    wb = client.get("/api/hails/glyph-generation-workbench").json()
    assert wb["staged_promotions"]["default"]["asset_ref"].startswith("staged/glyphs/")


def test_staged_glyph_asset_route(tmp_path, monkeypatch) -> None:
    client = _client(tmp_path, monkeypatch)
    r = client.get("/staged/glyphs/default/example-v001.svg")
    assert r.status_code == 200
    assert "svg" in r.headers.get("content-type", "")

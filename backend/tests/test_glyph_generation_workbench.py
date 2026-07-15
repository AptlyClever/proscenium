"""Glyph Generation Workbench v001 tests."""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from hails.glyph_generation_workbench import (
    WorkbenchValidationError,
    brief_from_registry_glyph,
    create_brief,
    load_workbench_seed,
    update_brief,
    validate_brief,
    validate_workbench_seed,
)
from hails.glyph_registry import hail_glyph_allowlist, registry_delivery_glyph_ids
from lcard_hail_seed import load_lcard_hail_seed
from main import app
from settings import settings


def _client(tmp_path: Path, monkeypatch) -> TestClient:
    p = tmp_path / "axiom-settings.json"
    p.write_text(json.dumps({}), encoding="utf-8")
    monkeypatch.setattr(settings, "settings_path", p)
    return TestClient(app)


def test_workbench_seed_valid_and_includes_default_brief() -> None:
    assert validate_workbench_seed() == []
    seed = load_workbench_seed()
    brief = next(b for b in seed["briefs"] if b["glyph_id"] == "default")
    assert brief["brief_id"] == "brief-default-v001"
    assert brief["generation_prompt"]
    assert brief["visual_constraints"]
    assert brief["target_surfaces"]


def test_seed_glyphs_represented_in_registry() -> None:
    seed_glyph_ids = {
        h.get("icon", {}).get("value")
        for h in load_lcard_hail_seed()
        if isinstance(h.get("icon"), dict)
    }
    seed_glyph_ids.discard(None)
    assert seed_glyph_ids <= set(registry_delivery_glyph_ids())


def test_brief_from_registry_seeds_default_glyph() -> None:
    brief = brief_from_registry_glyph("default", brief_id="brief-test")
    assert brief["glyph_id"] == "default"
    assert brief["registry_glyph_status"] == "approved"
    assert "axiom_ui" in brief["target_surfaces"]
    assert brief["candidate_slots"][0]["asset_ref"] is None


def test_unknown_glyph_rejected() -> None:
    with pytest.raises(WorkbenchValidationError):
        brief_from_registry_glyph("not-a-glyph")


def test_invalid_brief_status_rejected() -> None:
    brief = brief_from_registry_glyph("default", brief_id="brief-x")
    brief["status"] = "invalid-status"
    errors = validate_brief(brief)
    assert any(e["path"] == "/status" for e in errors)


def test_candidate_staged_asset_ref_valid_under_prefix() -> None:
    brief = brief_from_registry_glyph("default", brief_id="brief-y")
    brief["candidate_slots"][0] = {
        "candidate_id": brief["candidate_slots"][0]["candidate_id"],
        "status": "staged",
        "asset_ref": "staged/glyphs/default/candidate-001.svg",
        "asset_kind": "svg",
        "source": "manual_import",
        "created_at": "2026-06-13",
        "notes": "",
        "preview_only": True,
    }
    errors = validate_brief(brief)
    assert errors == []


def test_candidate_asset_ref_outside_prefix_rejected() -> None:
    brief = brief_from_registry_glyph("default", brief_id="brief-z")
    brief["candidate_slots"][0]["status"] = "staged"
    brief["candidate_slots"][0]["asset_ref"] = "assets/glyph.png"
    brief["candidate_slots"][0]["asset_kind"] = "png"
    errors = validate_brief(brief)
    assert any("/asset_ref" in e["path"] for e in errors)


def test_api_get_workbench_from_seed(tmp_path, monkeypatch) -> None:
    client = _client(tmp_path, monkeypatch)
    r = client.get("/api/hails/glyph-generation-workbench")
    assert r.status_code == 200
    body = r.json()
    assert body["source"] == "seed"
    assert body["seed_validation_errors"] == []
    assert "stage asset refs under staged/glyphs/" in body["safety_notice"]
    assert "Promotion does not replace" in body["safety_notice"]
    assert any(b["glyph_id"] == "default" for b in body["briefs"])


def test_api_create_and_update_brief(tmp_path, monkeypatch) -> None:
    client = _client(tmp_path, monkeypatch)
    r = client.post(
        "/api/hails/glyph-generation-workbench/briefs",
        json={"glyph_id": "default", "brief_id": "brief-default-test"},
    )
    assert r.status_code == 200
    created = r.json()
    assert created["glyph_id"] == "default"

    r2 = client.put(
        "/api/hails/glyph-generation-workbench/briefs/brief-default-test",
        json={"status": "ready_for_generation", "review_notes": "Prepared for future generation slice"},
    )
    assert r2.status_code == 200
    assert r2.json()["status"] == "ready_for_generation"

    r3 = client.get("/api/hails/glyph-generation-workbench")
    assert r3.json()["source"] == "domain"
    assert len(r3.json()["briefs"]) >= 2


def test_api_rejects_unknown_glyph_on_create(tmp_path, monkeypatch) -> None:
    client = _client(tmp_path, monkeypatch)
    r = client.post(
        "/api/hails/glyph-generation-workbench/briefs",
        json={"glyph_id": "unknown-glyph"},
    )
    assert r.status_code == 422


def test_api_archive_brief(tmp_path, monkeypatch) -> None:
    client = _client(tmp_path, monkeypatch)
    client.post(
        "/api/hails/glyph-generation-workbench/briefs",
        json={"glyph_id": "default", "brief_id": "brief-default-archive"},
    )
    r = client.post("/api/hails/glyph-generation-workbench/briefs/brief-default-archive/archive")
    assert r.status_code == 200
    assert r.json()["brief"]["status"] == "archived"


def test_create_brief_duplicate_id_rejected() -> None:
    existing = [brief_from_registry_glyph("default")]
    with pytest.raises(WorkbenchValidationError):
        create_brief({"glyph_id": "default", "brief_id": existing[0]["brief_id"]}, existing)

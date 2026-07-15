"""Glyph Asset Staging v001 tests."""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from hails.glyph_asset_staging import (
    STAGED_ASSET_PREFIX,
    validate_candidate_staging,
    validate_staged_asset_ref,
)
from hails.glyph_generation_workbench import (
    WorkbenchValidationError,
    brief_from_registry_glyph,
    clear_workbench_candidate,
    accept_workbench_candidate,
    reject_workbench_candidate,
    update_workbench_candidate,
)
from hails.glyph_registry import registry_entry
from main import app
from settings import settings


def _client(tmp_path: Path, monkeypatch) -> TestClient:
    p = tmp_path / "axiom-settings.json"
    p.write_text(json.dumps({}), encoding="utf-8")
    monkeypatch.setattr(settings, "settings_path", p)
    return TestClient(app)


def _staged_slot(**overrides) -> dict:
    base = {
        "candidate_id": "candidate-test-001",
        "status": "staged",
        "asset_ref": f"{STAGED_ASSET_PREFIX}default/candidate-001.svg",
        "asset_kind": "svg",
        "source": "manual_import",
        "created_at": "2026-06-13",
        "notes": "Imported externally",
        "preview_only": True,
    }
    base.update(overrides)
    return base


def test_valid_staged_candidate_with_relative_asset_ref() -> None:
    slot = _staged_slot()
    assert validate_candidate_staging(slot, 0) == []


@pytest.mark.parametrize(
    "asset_ref",
    [
        "/absolute/path.svg",
        "https://example.com/glyph.svg",
        "http://cdn.example/glyph.png",
        "assets/glyph.svg",
        f"../{STAGED_ASSET_PREFIX}evil.svg",
    ],
)
def test_invalid_asset_ref_rejected(asset_ref: str) -> None:
    slot = _staged_slot(asset_ref=asset_ref)
    errors = validate_candidate_staging(slot, 0)
    assert any("asset_ref" in e["path"] for e in errors)


def test_invalid_asset_kind_rejected() -> None:
    slot = _staged_slot(asset_kind="gif")
    errors = validate_candidate_staging(slot, 0)
    assert any("asset_kind" in e["path"] for e in errors)


def test_invalid_source_rejected() -> None:
    slot = _staged_slot(source="ai_pipeline")
    errors = validate_candidate_staging(slot, 0)
    assert any("source" in e["path"] for e in errors)


def test_clear_resets_candidate_to_empty() -> None:
    brief = brief_from_registry_glyph("default", brief_id="brief-clear-test")
    brief["candidate_slots"][0] = _staged_slot(candidate_id=brief["candidate_slots"][0]["candidate_id"])
    briefs = [brief]
    candidate_id = brief["candidate_slots"][0]["candidate_id"]
    cleared = clear_workbench_candidate("brief-clear-test", candidate_id, briefs)
    slot = cleared["candidate_slots"][0]
    assert slot["status"] == "empty"
    assert slot["asset_ref"] is None
    assert slot["asset_kind"] is None
    assert slot["source"] is None


def test_accept_marks_local_candidate_only_registry_unchanged() -> None:
    brief = brief_from_registry_glyph("default", brief_id="brief-accept-test")
    candidate_id = brief["candidate_slots"][0]["candidate_id"]
    brief["candidate_slots"][0] = _staged_slot(candidate_id=candidate_id)
    briefs = [brief]
    registry_before = registry_entry("default")
    accepted = accept_workbench_candidate("brief-accept-test", candidate_id, briefs, notes="Looks good locally")
    slot = accepted["candidate_slots"][0]
    assert slot["status"] == "accepted"
    assert slot["asset_ref"].startswith(STAGED_ASSET_PREFIX)
    registry_after = registry_entry("default")
    assert registry_after == registry_before


def test_reject_marks_local_candidate_only() -> None:
    brief = brief_from_registry_glyph("default", brief_id="brief-reject-test")
    candidate_id = brief["candidate_slots"][0]["candidate_id"]
    brief["candidate_slots"][0] = _staged_slot(candidate_id=candidate_id)
    rejected = reject_workbench_candidate("brief-reject-test", candidate_id, [brief], notes="Not suitable")
    assert rejected["candidate_slots"][0]["status"] == "rejected"


def test_unknown_candidate_id_rejected() -> None:
    brief = brief_from_registry_glyph("default", brief_id="brief-unknown-candidate")
    with pytest.raises(KeyError):
        update_workbench_candidate("brief-unknown-candidate", "missing-candidate", _staged_slot(), [brief])


def test_api_put_staged_candidate(tmp_path, monkeypatch) -> None:
    client = _client(tmp_path, monkeypatch)
    brief_id = "brief-default-v001"
    candidate_id = "candidate-default-001"
    r = client.put(
        f"/api/hails/glyph-generation-workbench/briefs/{brief_id}/candidates/{candidate_id}",
        json=_staged_slot(candidate_id=candidate_id),
    )
    assert r.status_code == 200
    slot = r.json()["candidate_slots"][0]
    assert slot["status"] == "staged"
    assert slot["asset_ref"].startswith(STAGED_ASSET_PREFIX)


def test_api_clear_accept_reject_candidate(tmp_path, monkeypatch) -> None:
    client = _client(tmp_path, monkeypatch)
    brief_id = "brief-default-v001"
    candidate_id = "candidate-default-001"
    client.put(
        f"/api/hails/glyph-generation-workbench/briefs/{brief_id}/candidates/{candidate_id}",
        json=_staged_slot(candidate_id=candidate_id),
    )
    r_accept = client.post(
        f"/api/hails/glyph-generation-workbench/briefs/{brief_id}/candidates/{candidate_id}/accept",
        json={"notes": "Accepted for later promotion slice"},
    )
    assert r_accept.status_code == 200
    assert r_accept.json()["candidate_slots"][0]["status"] == "accepted"

    r_clear = client.post(
        f"/api/hails/glyph-generation-workbench/briefs/{brief_id}/candidates/{candidate_id}/clear",
    )
    assert r_clear.status_code == 200
    assert r_clear.json()["candidate_slots"][0]["status"] == "empty"

    client.put(
        f"/api/hails/glyph-generation-workbench/briefs/{brief_id}/candidates/{candidate_id}",
        json=_staged_slot(candidate_id=candidate_id),
    )
    r_reject = client.post(
        f"/api/hails/glyph-generation-workbench/briefs/{brief_id}/candidates/{candidate_id}/reject",
    )
    assert r_reject.status_code == 200
    assert r_reject.json()["candidate_slots"][0]["status"] == "rejected"


def test_api_unknown_candidate_returns_404(tmp_path, monkeypatch) -> None:
    client = _client(tmp_path, monkeypatch)
    r = client.put(
        "/api/hails/glyph-generation-workbench/briefs/brief-default-v001/candidates/no-such-candidate",
        json=_staged_slot(candidate_id="no-such-candidate"),
    )
    assert r.status_code == 404


def test_no_generation_invoke_endpoint_exists() -> None:
    paths = {getattr(route, "path", "") for route in app.routes}
    forbidden = [p for p in paths if "glyph-generation-workbench" in p and any(k in p for k in ("generate", "render", "invoke"))]
    assert forbidden == []


def test_validate_staged_asset_ref_unit() -> None:
    assert validate_staged_asset_ref(f"{STAGED_ASSET_PREFIX}ok.svg") == []
    assert validate_staged_asset_ref("https://x/y") != []

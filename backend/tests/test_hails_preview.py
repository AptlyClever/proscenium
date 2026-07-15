"""Hails management preview and derive-preview API tests."""

from __future__ import annotations

import copy
import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from hails.hails_preview import (
    derive_hail_management_preview,
    hail_list_contract_summary,
    validate_hail_draft,
)
from lcard_hail_seed import load_lcard_hail_seed
from main import app
from settings import settings


def _client(tmp_path: Path, monkeypatch) -> TestClient:
    p = tmp_path / "axiom-settings.json"
    p.write_text(json.dumps({}), encoding="utf-8")
    monkeypatch.setattr(settings, "settings_path", p)
    return TestClient(app)


def test_derive_preview_seed_hail_projects_medium() -> None:
    seed = next(h for h in load_lcard_hail_seed() if h["id"] == "hail.spoon_transporter.001")
    result = derive_hail_management_preview(seed)
    assert result["validation"]["valid"] is True
    payload = result["render_payload"]
    assert payload["size_tier"] == "medium"
    assert payload["size_code"] == "M"
    assert payload["effect_id"] == "transporter"
    assert result["renderer_readiness"]["status"] == "ready"


def test_derive_preview_unknown_glyph_fails() -> None:
    seed = next(h for h in load_lcard_hail_seed() if h["id"] == "hail.spoon_transporter.001")
    draft = {**seed, "icon": {"kind": "glyph", "value": "not-a-glyph"}}
    result = derive_hail_management_preview(draft)
    assert result["validation"]["valid"] is False
    paths = [e["path"] for e in result["validation"]["errors"]]
    assert "/icon/value" in paths


def test_derive_preview_unknown_effect_fails() -> None:
    seed = next(h for h in load_lcard_hail_seed() if h["id"] == "hail.spoon_transporter.001")
    draft = {**seed, "visual": {**seed["visual"], "effect_id": "sparkle_storm"}}
    result = derive_hail_management_preview(draft)
    assert result["validation"]["valid"] is False
    paths = [e["path"] for e in result["validation"]["errors"]]
    assert "/visual/effect_id" in paths


def test_derive_preview_duration_out_of_bounds() -> None:
    seed = next(h for h in load_lcard_hail_seed() if h["id"] == "hail.spoon_transporter.001")
    draft = {**seed, "visual": {**seed["visual"], "duration_ms": 500}}
    result = derive_hail_management_preview(draft)
    assert result["validation"]["valid"] is False
    assert any(e["path"] == "/visual/duration_ms" for e in result["validation"]["errors"])


def test_derive_preview_message_too_long() -> None:
    seed = next(h for h in load_lcard_hail_seed() if h["id"] == "hail.spoon_transporter.001")
    draft = {**seed, "message": {"short_text": "x" * 121}}
    result = derive_hail_management_preview(draft)
    assert result["validation"]["valid"] is False
    assert any(e["path"] == "/message/short_text" for e in result["validation"]["errors"])


def test_derive_preview_includes_lifecycle_and_effect_identity() -> None:
    seed = next(h for h in load_lcard_hail_seed() if h["id"] == "hail.spoon_transporter.001")
    result = derive_hail_management_preview(seed)
    payload = result["render_payload"]
    assert payload["size_tier"] == "medium"
    assert "lifecycle_timing" in payload
    assert payload["lifecycle_timing"]["stable_hold_ms"] == 5000
    assert "effect_identity" in payload


def test_hail_list_contract_summary_fields() -> None:
    seed = next(h for h in load_lcard_hail_seed() if h["id"] == "hail.spoon_transporter.001")
    summary = hail_list_contract_summary(seed)
    assert summary["glyph_id"] == "default"
    assert summary["effect_id"] == "transporter"
    assert summary["size_tier"] == "medium"
    assert summary["source_room_id"] == "arcade"
    assert summary["target_room_id"] == "master_bedroom"
    assert summary["renderer_readiness_status"] == "ready"


def test_derive_preview_includes_preview_sizing_for_projector_room() -> None:
    seed = next(h for h in load_lcard_hail_seed() if h["id"] == "hail.spoon_transporter.001")
    draft = copy.deepcopy(seed)
    draft["delivery_policy"]["routes"][0]["destination_room_id"] = "arcade"
    result = derive_hail_management_preview(draft)
    sizing = result["preview_sizing"]
    assert sizing["room_id"] == "arcade"
    assert sizing["display_class"] == "projector"
    assert "Arcade" in sizing["label"]
    assert result["render_payload"]["display_class"] == "projector"


def test_api_derive_preview_endpoint(tmp_path, monkeypatch) -> None:
    client = _client(tmp_path, monkeypatch)
    seed = next(h for h in load_lcard_hail_seed() if h["id"] == "hail.spoon_transporter.001")
    r = client.post("/api/hails/derive-preview", json={"record": seed})
    assert r.status_code == 200
    body = r.json()
    assert body["validation"]["valid"] is True
    assert body["render_payload"]["size_code"] == "M"


def test_derive_preview_dual_glyph_render_for_custom_glyph() -> None:
    from hails.hails_spoon_transporter import spoon_transporter_custom_glyphs

    seed = next(h for h in load_lcard_hail_seed() if h["id"] == "hail.spoon_transporter.001")
    glyphs = spoon_transporter_custom_glyphs()
    result = derive_hail_management_preview(seed, custom_glyphs=glyphs)
    payload = result["render_payload"]
    assert payload["glyph_render"]["representation"] == "projected"
    assert payload["glyph_render_canonical"]["representation"] == "canonical"


def test_validate_hail_draft_preserves_route_policy_fields() -> None:
    seed = next(h for h in load_lcard_hail_seed() if h["id"] == "hail.spoon_transporter.001")
    errors = validate_hail_draft(seed)
    assert errors == []
    routes = seed["delivery_policy"]["routes"]
    assert routes[0]["launch_room_id"] == "arcade"

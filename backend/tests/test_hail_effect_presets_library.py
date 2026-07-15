"""Tests for settings-backed Effect preset library (Hail Forge Slice 3)."""

from __future__ import annotations

import json
from pathlib import Path

from fastapi.testclient import TestClient

from hails.hail_effect_presets_library import (
    merged_effect_presets,
    register_custom_effect_preset,
    reset_gallery_effect_preset,
    save_effect_preset,
)
from hails.hail_effects_gallery import gallery_presets
from main import app
from schemas import AxiomStoredSettings
from settings import settings


def _client(tmp_path: Path, monkeypatch) -> TestClient:
    p = tmp_path / "axiom-settings.json"
    p.write_text(json.dumps({}), encoding="utf-8")
    monkeypatch.setattr(settings, "settings_path", p)
    return TestClient(app)


def test_merged_presets_include_gallery_defaults() -> None:
    st = AxiomStoredSettings()
    merged = merged_effect_presets(st)
    gallery_ids = {p["id"] for p in gallery_presets()}
    assert gallery_ids.issubset({p["id"] for p in merged})
    sweep = next(p for p in merged if p["id"] == "transporter-sweep")
    assert sweep["source"] == "gallery"
    assert sweep["overridden"] is False


def test_save_gallery_preset_override(tmp_path, monkeypatch) -> None:
    client = _client(tmp_path, monkeypatch)
    quiet = next(p for p in gallery_presets() if p["id"] == "quiet-signal")
    updated = client.put(
        f"/api/hails/composer/effect-presets/{quiet['id']}",
        json={
            **quiet,
            "label": "Quiet Signal (Edited)",
        },
    )
    assert updated.status_code == 200
    body = updated.json()
    assert body["label"] == "Quiet Signal (Edited)"
    assert body["source"] == "gallery"
    assert body["overridden"] is True

    listed = client.get("/api/hails").json()
    stored = next(p for p in listed["effect_presets"] if p["id"] == quiet["id"])
    assert stored["label"] == "Quiet Signal (Edited)"
    assert stored["overridden"] is True


def test_reset_gallery_preset_override(tmp_path, monkeypatch) -> None:
    client = _client(tmp_path, monkeypatch)
    quiet = next(p for p in gallery_presets() if p["id"] == "quiet-signal")
    client.put(
        f"/api/hails/composer/effect-presets/{quiet['id']}",
        json={**quiet, "label": "Temporary label"},
    )
    reset = client.post(f"/api/hails/composer/effect-presets/{quiet['id']}/reset")
    assert reset.status_code == 200
    assert reset.json()["label"] == quiet["label"]
    assert reset.json()["overridden"] is False


def test_custom_effect_preset_crud(tmp_path, monkeypatch) -> None:
    client = _client(tmp_path, monkeypatch)
    created = client.post(
        "/api/hails/composer/effect-presets",
        json={
            "label": "My Soft Transporter",
            "description": "Operator custom preset",
            "effect_id": "transporter",
            "effect_tuning": {"beam_intensity": 0.55, "beam_shape": "column", "beam_scale": 1.0, "beam_color_emphasis": 0.7},
            "visual": {
                "effect_id": "transporter",
                "palette_id": "axiom_dark_cyan",
                "scale": "medium",
                "duration_ms": 5000,
                "placement_id": "upper_center",
            },
        },
    )
    assert created.status_code == 200
    preset_id = created.json()["id"]
    assert preset_id.startswith("custom-effect-")
    assert created.json()["source"] == "custom"

    renamed = client.put(
        f"/api/hails/composer/effect-presets/{preset_id}",
        json={**created.json(), "label": "Renamed Preset"},
    )
    assert renamed.status_code == 200
    assert renamed.json()["label"] == "Renamed Preset"

    deleted = client.delete(f"/api/hails/composer/effect-presets/{preset_id}")
    assert deleted.status_code == 200
    listed = client.get("/api/hails").json()
    assert preset_id not in {p["id"] for p in listed["effect_presets"]}


def test_delete_builtin_preset_rejected(tmp_path, monkeypatch) -> None:
    client = _client(tmp_path, monkeypatch)
    r = client.delete("/api/hails/composer/effect-presets/transporter-sweep")
    assert r.status_code == 400


def test_register_and_save_via_domain() -> None:
    st = AxiomStoredSettings()
    created = register_custom_effect_preset(
        st,
        {
            "label": "Domain Preset",
            "description": "Test",
            "visual": {
                "effect_id": "pop",
                "palette_id": "cute_purple",
                "scale": "small",
                "duration_ms": 4000,
                "placement_id": "upper_center",
            },
        },
    )
    assert created["source"] == "custom"
    quiet = next(p for p in gallery_presets() if p["id"] == "quiet-signal")
    saved = save_effect_preset(st, quiet["id"], {**quiet, "label": "Edited Quiet"})
    assert saved["overridden"] is True
    reset = reset_gallery_effect_preset(st, quiet["id"])
    assert reset["overridden"] is False

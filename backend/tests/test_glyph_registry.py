"""Glyph registry loader, allowlist derivation, and validation tests."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from hails.glyph_registry import (
    hail_glyph_allowlist,
    load_glyph_registry,
    registry_delivery_glyph_ids,
    registry_path,
    validate_delivery_glyph_id,
    validate_glyph_id,
    validate_glyph_registry,
    validate_registry_contract_alignment,
)
from hails.hails_domain import KNOWN_GLYPH_IDS, HailValidationError, update_hail
from lcard_hail_seed import load_lcard_hail_seed
from main import app
from settings import settings


def test_registry_file_exists_and_parses() -> None:
    assert registry_path().is_file()
    doc = load_glyph_registry()
    assert doc["version"] == "v001"
    assert validate_glyph_registry(doc) == []


def test_registry_covers_all_seed_glyph_ids() -> None:
    """Every seed hail glyph resolves from the registry or the seed-provided custom specs."""
    from hails.hails_composer import seed_custom_glyphs

    seed_glyph_ids = {
        h.get("icon", {}).get("value")
        for h in load_lcard_hail_seed()
        if isinstance(h.get("icon"), dict)
    }
    seed_glyph_ids.discard(None)
    resolvable = set(registry_delivery_glyph_ids()) | set(seed_custom_glyphs().keys())
    assert seed_glyph_ids <= resolvable


def test_hail_glyph_allowlist_matches_domain_constant() -> None:
    assert KNOWN_GLYPH_IDS == registry_delivery_glyph_ids()


def test_allowlist_matches_render_contract() -> None:
    assert validate_registry_contract_alignment() == []


def test_selectable_allowlist_is_default_only() -> None:
    selectable = hail_glyph_allowlist()
    assert selectable == ("default",)


def test_delivery_allowlist_includes_registry_marks() -> None:
    delivery = registry_delivery_glyph_ids()
    assert "default" in delivery
    assert "hail-beacon" in delivery


def test_validate_glyph_id_selectable_only() -> None:
    assert validate_glyph_id("default") is True
    assert validate_glyph_id("hail-beacon") is False
    assert validate_glyph_id("not-a-glyph") is False


def test_validate_delivery_glyph_id_includes_deprecated() -> None:
    assert validate_delivery_glyph_id("default") is True
    assert validate_delivery_glyph_id("hail-beacon") is True
    assert validate_delivery_glyph_id("not-a-glyph") is False


def test_update_hail_rejects_unknown_glyph() -> None:
    seed = load_lcard_hail_seed()
    hail_id = seed[0]["id"]
    with pytest.raises(HailValidationError) as exc:
        update_hail(
            hail_id,
            {"icon": {"kind": "glyph", "value": "unknown-glyph-id"}},
            seed,
        )
    paths = [e["path"] for e in exc.value.errors]
    assert "/icon/value" in paths


def test_api_list_hails_includes_glyph_catalog(tmp_path, monkeypatch) -> None:
    monkeypatch.setattr(settings, "settings_path", tmp_path / "axiom-settings.json")
    client = TestClient(app)
    r = client.get("/api/hails")
    assert r.status_code == 200
    data = r.json()
    assert "glyph_catalog" in data
    assert "default" in data["known_glyphs"]
    catalog_ids = {e["glyph_id"] for e in data["glyph_catalog"]}
    assert "default" in catalog_ids

"""Tests for LCARD catalog projection (Beta B4)."""

from __future__ import annotations

from hails.hail_lcard_catalog import (
    chip_glyph_thumb_path,
    compute_hails_catalog_revision,
    project_lcard_catalog_fields,
    render_chip_glyph_thumb_svg,
    stamp_lcard_catalog_fields,
)
from hails.hail_package_v2 import stamp_hail_package_metadata


def test_chip_thumb_path_and_svg() -> None:
    assert chip_glyph_thumb_path("hail.beta.001") == "/api/hails/hail.beta.001/chip-glyph-thumb"
    seed = render_chip_glyph_thumb_svg(glyph_id="default", hail_name="Default")
    assert "<svg" in seed
    assert 'path d="M24 16v16' in seed
    summons = render_chip_glyph_thumb_svg(glyph_id="hail-summons", hail_name="Hamburger")
    assert "<svg" in summons
    assert "<path" in summons


def test_stamp_lcard_catalog_fields_on_package() -> None:
    stamped = stamp_hail_package_metadata(
        {"id": "hail.beta.001", "name": "Beta"},
        {
            "components_fingerprint": "abc123",
            "catalog_ready": True,
            "layout_contract_version": "v001-integration",
            "consumer_manifest_id": "consumer-capability-manifest.v002",
        },
    )
    pkg = stamped["hail_package"]
    assert pkg["chip_glyph_thumb_url"] == "/api/hails/hail.beta.001/chip-glyph-thumb"
    assert pkg["catalog_revision"] == 1
    assert pkg["catalog_schema_version"] == 2


def test_project_lcard_catalog_fields_absolutizes_thumb() -> None:
    row = project_lcard_catalog_fields(
        {
            "id": "hail.beta.001",
            "message": {"short_text": "Hello"},
            "hail_package": {
                "chip_glyph_thumb_url": "/api/hails/hail.beta.001/chip-glyph-thumb",
                "catalog_revision": 2,
            },
        },
        public_base_url="http://192.168.68.93:7895",
    )
    assert row["message_preview"] == "Hello"
    assert row["chip_glyph_thumb_url"].startswith("http://192.168.68.93:7895/")
    assert row["catalog_revision"] == 2


def test_compute_hails_catalog_revision_changes_with_package() -> None:
    base = [{"id": "hail.a", "hail_package": {"package_version": 1, "catalog_ready": True}}]
    bumped = [{"id": "hail.a", "hail_package": {"package_version": 2, "catalog_ready": True}}]
    assert compute_hails_catalog_revision(base) != compute_hails_catalog_revision(bumped)

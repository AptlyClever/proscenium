"""Consumer Capability Manifest v002 — Beta save/send gate."""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

from hails.hails_glyph_render import is_google_tv_glyph_deliverable
from hails.hail_glyph_art_layout import validate_glyph_art_regions
from hails.hail_paintbox_layout import validate_layout_regions_parity
from hails.hails_render_contract import load_hail_render_contract_for_generation

MANIFEST_ID = "consumer-capability-manifest.v002"
MANIFEST_REL_PATH = Path("config") / "hails" / "consumer-capability-manifest.v002.json"
PACKAGE_SCHEMA_VERSION = 2


def _repo_root() -> Path:
    module_dir = Path(__file__).resolve().parent
    # Package lives in backend/hails; walk up to find config/ (repo root in dev,
    # /app in Docker where backend is copied flat).
    for candidate in (module_dir, *module_dir.parents):
        if (candidate / "config" / "hails").is_dir():
            return candidate
    return module_dir.parents[1]


@lru_cache(maxsize=1)
def load_consumer_capability_manifest() -> dict[str, Any]:
    path = _repo_root() / MANIFEST_REL_PATH
    with path.open(encoding="utf-8") as fh:
        return json.load(fh)


def reload_consumer_capability_manifest() -> dict[str, Any]:
    load_consumer_capability_manifest.cache_clear()
    return load_consumer_capability_manifest()


def google_tv_manifest(manifest: dict[str, Any] | None = None) -> dict[str, Any]:
    doc = manifest or load_consumer_capability_manifest()
    block = doc.get("consumers", {}).get("google_tv_apk", {})
    return block if isinstance(block, dict) else {}


def validate_hail_package_for_consumers(
    payload: dict[str, Any],
    *,
    manifest: dict[str, Any] | None = None,
    require_package_schema_v2: bool = True,
) -> list[dict[str, str]]:
    """Return validation errors; empty list means deliverable."""
    doc = manifest or load_consumer_capability_manifest()
    apk = google_tv_manifest(doc)
    errors: list[dict[str, str]] = []

    if require_package_schema_v2:
        schema_version = payload.get("package_schema_version")
        if schema_version != PACKAGE_SCHEMA_VERSION:
            errors.append(
                {
                    "path": "/package_schema_version",
                    "message": f"package_schema_version must be {PACKAGE_SCHEMA_VERSION}",
                }
            )

    effect_id = str(payload.get("effect_id") or "").strip()
    allowed_effects = apk.get("deliverable_effects") or []
    if effect_id not in allowed_effects:
        errors.append(
            {
                "path": "/effect_id",
                "message": f"effect {effect_id!r} is not deliverable on Google TV (allowed: {allowed_effects})",
            }
        )

    glyph_render = payload.get("glyph_render")
    if not is_google_tv_glyph_deliverable(glyph_render if isinstance(glyph_render, dict) else None):
        kind = glyph_render.get("kind") if isinstance(glyph_render, dict) else "missing"
        errors.append(
            {
                "path": "/glyph_render",
                "message": f"glyph is not Google TV deliverable (kind={kind!r}); emoji fallback is not allowed",
            }
        )

    tier = str(payload.get("size_tier") or "").strip()
    allowed_tiers = apk.get("size_tiers") or []
    if tier and tier not in allowed_tiers:
        errors.append({"path": "/size_tier", "message": f"size_tier {tier!r} is not supported"})

    placement_id = str(payload.get("placement_id") or "").strip()
    allowed_placements = apk.get("placement_ids") or []
    if placement_id and allowed_placements and placement_id not in allowed_placements:
        errors.append(
            {"path": "/placement_id", "message": f"placement_id {placement_id!r} is not supported"}
        )

    message_text = payload.get("message")
    if isinstance(payload.get("message_entity"), dict):
        message_text = payload["message_entity"].get("text", message_text)
    message_text = str(message_text or "")
    max_len = int(apk.get("message_max_length") or 120)
    if len(message_text) > max_len:
        errors.append(
            {
                "path": "/message",
                "message": f"message exceeds {max_len} characters for TV overlay",
            }
        )

    if not payload.get("layout_regions"):
        errors.append(
            {
                "path": "/layout_regions",
                "message": "layout_regions required for package_schema_version 2",
            }
        )
    else:
        expected_layout_version = str(doc.get("layout_contract_version") or "").strip()
        layout_version = str(payload.get("layout_contract_version") or "").strip()
        if expected_layout_version and layout_version != expected_layout_version:
            errors.append(
                {
                    "path": "/layout_contract_version",
                    "message": (
                        f"layout_contract_version must be {expected_layout_version!r} "
                        f"(got {layout_version!r}); re-Save in Axiom"
                    ),
                }
            )
        contract_generation = layout_version or expected_layout_version or None
        contract = load_hail_render_contract_for_generation(contract_generation)
        layout_regions = payload.get("layout_regions")
        errors.extend(validate_layout_regions_parity(payload, contract=contract))
        if isinstance(layout_regions, dict):
            errors.extend(validate_glyph_art_regions(layout_regions))

    return errors

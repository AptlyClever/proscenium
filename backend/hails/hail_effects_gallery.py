"""Hail Effects Gallery v001 — preset loader and validation.

Canonical artifact: ``config/hails/hail-effects-gallery.v001.json``

Named presentation presets map to existing visual contract fields for Hails Composer.
No runtime, marketplace, or production asset pipeline integration.
"""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

from hails.hails_domain import KNOWN_PALETTE_IDS, KNOWN_SIZE_TIERS, KNOWN_PLACEMENT_IDS
from hails.hails_composer import TRANSITION_STYLES
from hails.hails_render_contract import active_effect_ids, validate_effect_tuning

GALLERY_REL_PATH = Path("config") / "hails" / "hail-effects-gallery.v001.json"


def _repo_root() -> Path:
    module_dir = Path(__file__).resolve().parent
    # Package lives in backend/hails; walk up to find config/ (repo root in dev,
    # /app in Docker where backend is copied flat).
    for candidate in (module_dir, *module_dir.parents):
        if (candidate / "config" / "hails").is_dir():
            return candidate
    return module_dir.parents[1]


def gallery_path() -> Path:
    return _repo_root() / GALLERY_REL_PATH


@lru_cache(maxsize=1)
def load_hail_effects_gallery() -> dict[str, Any]:
    path = gallery_path()
    with path.open(encoding="utf-8") as fh:
        return json.load(fh)


def reload_hail_effects_gallery() -> dict[str, Any]:
    load_hail_effects_gallery.cache_clear()
    return load_hail_effects_gallery()


def gallery_presets(doc: dict[str, Any] | None = None) -> list[dict[str, Any]]:
    document = doc or load_hail_effects_gallery()
    presets = document.get("presets")
    if not isinstance(presets, list):
        return []
    return [p for p in presets if isinstance(p, dict) and (p.get("id") or "").strip()]


def validate_hail_effects_gallery(doc: dict[str, Any] | None = None) -> list[dict[str, str]]:
    document = doc or load_hail_effects_gallery()
    errors: list[dict[str, str]] = []
    presets = document.get("presets")
    if not isinstance(presets, list) or not presets:
        errors.append({"path": "/presets", "message": "presets must be a non-empty array"})
        return errors

    seen_ids: set[str] = set()
    for index, preset in enumerate(presets):
        base = f"/presets/{index}"
        if not isinstance(preset, dict):
            errors.append({"path": base, "message": "preset must be an object"})
            continue
        preset_id = (preset.get("id") or "").strip()
        if not preset_id:
            errors.append({"path": f"{base}/id", "message": "id is required"})
        elif preset_id in seen_ids:
            errors.append({"path": f"{base}/id", "message": f"duplicate preset id: {preset_id}"})
        else:
            seen_ids.add(preset_id)

        label = (preset.get("label") or "").strip()
        if not label:
            errors.append({"path": f"{base}/label", "message": "label is required"})

        visual = preset.get("visual")
        if not isinstance(visual, dict):
            errors.append({"path": f"{base}/visual", "message": "visual must be an object"})
            continue

        effect_id = (visual.get("effect_id") or preset.get("effect_id") or "").strip()
        if not effect_id:
            errors.append({"path": f"{base}/visual/effect_id", "message": "effect_id is required"})
        elif effect_id not in active_effect_ids():
            errors.append(
                {
                    "path": f"{base}/visual/effect_id",
                    "message": f"effect_id must be one of: {', '.join(active_effect_ids())}",
                }
            )

        top_level_effect = (preset.get("effect_id") or "").strip()
        if top_level_effect and effect_id and top_level_effect != effect_id:
            errors.append(
                {
                    "path": f"{base}/effect_id",
                    "message": "top-level effect_id must match visual.effect_id when both are set",
                }
            )

        effect_tuning = preset.get("effect_tuning")
        if effect_tuning is not None and effect_id:
            for err in validate_effect_tuning(effect_id, effect_tuning):
                suffix = err["path"].removeprefix("/visual/effect_tuning")
                errors.append({"path": f"{base}/effect_tuning{suffix}", "message": err["message"]})

        palette_id = (visual.get("palette_id") or "").strip()
        if palette_id not in KNOWN_PALETTE_IDS:
            errors.append(
                {
                    "path": f"{base}/visual/palette_id",
                    "message": f"palette_id must be one of: {', '.join(KNOWN_PALETTE_IDS)}",
                }
            )

        scale = (visual.get("scale") or "").strip()
        if scale not in KNOWN_SIZE_TIERS:
            errors.append(
                {
                    "path": f"{base}/visual/scale",
                    "message": f"scale must be one of: {', '.join(KNOWN_SIZE_TIERS)}",
                }
            )

        placement_id = (visual.get("placement_id") or "").strip()
        if placement_id and placement_id not in KNOWN_PLACEMENT_IDS:
            errors.append(
                {
                    "path": f"{base}/visual/placement_id",
                    "message": f"placement_id must be one of: {', '.join(KNOWN_PLACEMENT_IDS)}",
                }
            )

        transition = (preset.get("transition_style") or "").strip()
        if transition and transition not in TRANSITION_STYLES:
            errors.append(
                {
                    "path": f"{base}/transition_style",
                    "message": f"transition_style must be one of: {', '.join(TRANSITION_STYLES)}",
                }
            )

    return errors


def effects_gallery_summary(doc: dict[str, Any] | None = None) -> dict[str, Any]:
    document = doc or load_hail_effects_gallery()
    presets = gallery_presets(document)
    return {
        "gallery_id": document.get("gallery_id") or "hail-effects-gallery-v001",
        "schema_version": document.get("schema_version", 1),
        "preset_count": len(presets),
        "reduced_motion_preset_ids": [
            p["id"] for p in presets if p.get("reduced_motion") is True and (p.get("id") or "").strip()
        ],
    }

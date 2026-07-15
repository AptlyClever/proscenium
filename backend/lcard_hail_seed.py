"""Committed LCARD Hail definition seed merged into effective app_settings.

Committed Hail seed used until Proscenium materializes its own catalog.
"""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

from settings import _resolve_repo_root


def _seed_path() -> Path:
    return _resolve_repo_root() / "config" / "lcard" / "hail-definitions.json"


def _normalize_seed_hail(item: dict[str, Any]) -> dict[str, Any]:
    from hails.hails_spoon_transporter import (
        SPOON_TRANSPORTER_HAIL_ID,
        build_spoon_transporter_hail_body,
    )

    if str(item.get("id") or "").strip() == SPOON_TRANSPORTER_HAIL_ID:
        return build_spoon_transporter_hail_body()
    return dict(item)


@lru_cache(maxsize=1)
def load_lcard_hail_seed() -> list[dict[str, Any]]:
    path = _seed_path()
    if not path.is_file():
        return []
    try:
        document = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return []
    hails = document.get("hails")
    if not isinstance(hails, list):
        return []
    return [_normalize_seed_hail(item) for item in hails if isinstance(item, dict)]


def load_lcard_glyph_seed() -> list[dict[str, Any]]:
    from hails.hails_spoon_transporter import spoon_transporter_custom_glyphs

    return list(spoon_transporter_custom_glyphs().values())


def merge_lcard_hail_seed(app_blob: dict[str, Any]) -> dict[str, Any]:
    seed_hails = load_lcard_hail_seed()
    if not seed_hails:
        return app_blob

    existing = app_blob.get("hails")
    if isinstance(existing, list) and existing:
        return app_blob

    from hails.hails_delivery_policy import (
        enrich_hail_for_lcard_effective,
        ensure_hail_delivery_policy,
    )
    from hails.hails_spoon_transporter import spoon_transporter_custom_glyphs

    custom = spoon_transporter_custom_glyphs()
    merged = dict(app_blob)
    merged["hails"] = [
        enrich_hail_for_lcard_effective(
            ensure_hail_delivery_policy(dict(item)),
            custom_glyphs=custom,
        )
        for item in seed_hails
    ]
    merged["custom_glyphs"] = list(custom.values())
    return merged

"""Committed Hail seed used until Proscenium materializes its own catalog."""

from __future__ import annotations

import json
from functools import lru_cache
from typing import Any

from settings import _resolve_repo_root


@lru_cache(maxsize=1)
def load_lcard_hail_seed() -> list[dict[str, Any]]:
    path = _resolve_repo_root() / "config" / "lcard" / "hail-definitions.json"
    if not path.is_file():
        return []
    try:
        document = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return []
    hails = document.get("hails")
    if not isinstance(hails, list):
        return []
    return [dict(item) for item in hails if isinstance(item, dict)]

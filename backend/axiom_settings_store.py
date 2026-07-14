from __future__ import annotations

import json
from pathlib import Path

from pydantic import ValidationError

from schemas import AxiomStoredSettings


def _default_settings() -> AxiomStoredSettings:
    return AxiomStoredSettings()


def read_settings(path: Path) -> AxiomStoredSettings:
    if not path.exists():
        return _default_settings()
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        if isinstance(data, dict) and "hails" in data:
            data.setdefault("hails_catalog_materialized", True)
        return AxiomStoredSettings.model_validate(data)
    except (json.JSONDecodeError, ValidationError, OSError):
        return _default_settings()


def write_settings(path: Path, data: AxiomStoredSettings) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    payload = data.model_dump(mode="json")
    tmp.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    tmp.replace(path)


def patch_settings(path: Path, patch: dict) -> AxiomStoredSettings:
    current = read_settings(path)
    merged = current.model_dump(mode="json")
    merged.update(patch)
    out = AxiomStoredSettings.model_validate(merged)
    write_settings(path, out)
    return out

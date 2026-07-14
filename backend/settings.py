from __future__ import annotations

import os
from pathlib import Path
from typing import Any

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


def _resolve_repo_root() -> Path:
    """Return the Proscenium repository root in source and container layouts."""
    configured = os.environ.get("PROSCENIUM_REPO_ROOT", "").strip()
    if configured:
        return Path(configured).expanduser().resolve()

    backend_root = Path(__file__).resolve().parent
    repo_root = backend_root.parent
    if (repo_root / "PRODUCT.md").is_file() or (repo_root / "config" / "hails").is_dir():
        return repo_root
    return repo_root


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="PROSCENIUM_",
        env_file=".env",
        extra="ignore",
    )

    settings_path: Path | None = Field(default=None)
    static_root: Path | None = Field(default=None)

    @model_validator(mode="after")
    def default_paths(self) -> Any:
        root = _resolve_repo_root()
        if self.settings_path is None:
            self.settings_path = root / "data" / "hails-settings.json"
        if self.static_root is None:
            built = root / "frontend" / "dist"
            container_static = root / "static"
            self.static_root = built if built.is_dir() else container_static
        return self


settings = Settings()

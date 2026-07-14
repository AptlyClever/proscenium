from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class AxiomStoredSettings(BaseModel):
    """Temporary compatibility name for Proscenium-owned Hails state."""

    settings_version: int = 1
    app_settings: dict[str, dict[str, Any]] = Field(default_factory=dict)
    hails: list[dict[str, Any]] = Field(default_factory=list)
    hails_catalog_materialized: bool = False
    glyph_generation_workbench: dict[str, Any] = Field(default_factory=dict)
    glyph_staged_promotions: dict[str, Any] = Field(default_factory=dict)
    custom_glyphs: dict[str, Any] = Field(default_factory=dict)
    custom_effect_presets: dict[str, Any] = Field(default_factory=dict)
    effect_preset_overrides: dict[str, Any] = Field(default_factory=dict)

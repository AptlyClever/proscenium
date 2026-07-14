"""Spoon transporter hail — upgraded programmatic hero (pso-20260618-axiom-glyph-hero-upgrade-or-remove)."""

from __future__ import annotations

from typing import Any

from hails.hails_composer import effective_hail_glyph_allowlist_for_custom, build_fixture_glyph_spec
from hails.hail_glyph_character import HERO_GLYPH_PROOF_FAMILY_ID
from hails.hails_domain import create_hail, update_hail

SPOON_TRANSPORTER_HAIL_ID = "hail.spoon_transporter.001"
SPOON_TRANSPORTER_DISPLAY_ID = "001"
SPOON_TRANSPORTER_NAME = "Spoon transporter test"
SPOON_TRANSPORTER_GLYPH_ID = "custom-spoon-transporter"
SPOON_TRANSPORTER_GLYPH_FAMILY = HERO_GLYPH_PROOF_FAMILY_ID
SPOON_TRANSPORTER_GLYPH_SEED = 90618004


def build_spoon_transporter_glyph_spec() -> dict[str, Any]:
    """Deterministic Characters-kind hero for spoon transporter proof hail."""
    return build_fixture_glyph_spec(
        glyph_name="Spoon",
        glyph_id=SPOON_TRANSPORTER_GLYPH_ID,
        glyph_family_id=SPOON_TRANSPORTER_GLYPH_FAMILY,
        seed=SPOON_TRANSPORTER_GLYPH_SEED,
        variation_only=True,
        scale="medium",
        palette_id="axiom_dark_cyan",
        effect_id="transporter",
    )


def spoon_transporter_custom_glyphs(
    custom_glyphs: dict[str, dict[str, Any]] | None = None,
) -> dict[str, dict[str, Any]]:
    spec = build_spoon_transporter_glyph_spec()
    merged = dict(custom_glyphs or {})
    merged[spec["glyph_id"]] = spec
    return merged


def build_spoon_transporter_hail_body() -> dict[str, Any]:
    """LCARD seed / domain body for spoon transporter variation proof."""
    return {
        "schema_version": 1,
        "id": SPOON_TRANSPORTER_HAIL_ID,
        "display_id": SPOON_TRANSPORTER_DISPLAY_ID,
        "name": SPOON_TRANSPORTER_NAME,
        "category": "cute",
        "enabled": True,
        "archived": False,
        "icon": {
            "kind": "glyph",
            "value": SPOON_TRANSPORTER_GLYPH_ID,
            "label": "Spoon",
        },
        "message": {
            "short_text": "Spoon transporter check",
            "variants": ["Spoon transporter check"],
        },
        "rooms": {
            "allowed_source_room_ids": ["arcade"],
            "allowed_target_room_ids": ["master_bedroom", "away_team", "arcade"],
            "badge_policy": "source_room",
        },
        "delivery_policy": {
            "routes": [
                {
                    "id": "route.arcade.master_bedroom.001",
                    "launch_room_id": "arcade",
                    "destination_room_id": "master_bedroom",
                    "provider": "lcard",
                    "requires_confirmation": False,
                    "enabled": True,
                },
                {
                    "id": "route.arcade.away_team.001",
                    "launch_room_id": "arcade",
                    "destination_room_id": "away_team",
                    "provider": "lcard",
                    "requires_confirmation": False,
                    "enabled": True,
                },
            ],
        },
        "visual": {
            "effect_id": "transporter",
            "effect_variation_id": "spoon",
            "palette_id": "axiom_dark_cyan",
            "scale": "medium",
            "duration_ms": 5000,
            "placement_id": "upper_center",
            "placement_mode": "preset",
            "anchor": "top_end",
            "reduced_motion_fallback": "static_toast",
        },
        "audio": {
            "enabled": False,
            "audio_id": "",
            "mode": "future",
            "volume": "soft",
            "delay_ms": 350,
        },
        "behavior": {
            "cooldown_sec": 30,
            "quiet_hours_policy": "respect",
            "requires_confirmation": False,
        },
        "advanced": {
            "intensity": 2,
            "particle_density": 1,
        },
    }


def upsert_spoon_transporter_hail(
    current_hails: list[dict[str, Any]],
    *,
    custom_glyphs: dict[str, dict[str, Any]] | None = None,
) -> tuple[dict[str, Any], str]:
    """Create or update spoon transporter hail in domain layer."""
    body = build_spoon_transporter_hail_body()
    glyphs = spoon_transporter_custom_glyphs(custom_glyphs)
    allowlist = effective_hail_glyph_allowlist_for_custom(glyphs)
    existing = next(
        (h for h in current_hails if str(h.get("id") or "").strip() == SPOON_TRANSPORTER_HAIL_ID),
        None,
    )
    domain_body = {k: v for k, v in body.items() if k not in ("schema_version", "rooms")}
    if existing is None:
        return (
            create_hail(
                domain_body,
                current_hails,
                glyph_allowlist=allowlist,
                custom_glyphs=glyphs,
            ),
            "created",
        )
    return (
        update_hail(
            SPOON_TRANSPORTER_HAIL_ID,
            domain_body,
            current_hails,
            glyph_allowlist=allowlist,
            custom_glyphs=glyphs,
        ),
        "updated",
    )

"""Away Team hail — device proof fixture with programmatic hero glyph."""

from __future__ import annotations

from typing import Any

from hails.hails_composer import effective_hail_glyph_allowlist_for_custom, build_fixture_glyph_spec
from hails.hail_glyph_character import HERO_GLYPH_PROOF_FAMILY_ID
from hails.hails_domain import create_hail, update_hail

AWAY_TEAM_HAIL_ID = "hail.away_team.001"
AWAY_TEAM_DISPLAY_ID = "009"
AWAY_TEAM_NAME = "Away Team"
AWAY_TEAM_GLYPH_ID = "custom-away-team"
AWAY_TEAM_GLYPH_FAMILY = HERO_GLYPH_PROOF_FAMILY_ID
AWAY_TEAM_GLYPH_SEED = 90618003
AWAY_TEAM_ROUTE_ID = "route.arcade.away_team.001"


def build_away_team_glyph_spec() -> dict[str, Any]:
    return build_fixture_glyph_spec(
        glyph_name="Away Team",
        glyph_id=AWAY_TEAM_GLYPH_ID,
        glyph_family_id=AWAY_TEAM_GLYPH_FAMILY,
        seed=AWAY_TEAM_GLYPH_SEED,
        variation_only=True,
        scale="large",
        palette_id="axiom_dark_cyan",
        effect_id="transporter",
    )


def away_team_custom_glyphs(
    custom_glyphs: dict[str, dict[str, Any]] | None = None,
) -> dict[str, dict[str, Any]]:
    spec = build_away_team_glyph_spec()
    merged = dict(custom_glyphs or {})
    merged[spec["glyph_id"]] = spec
    return merged


def build_away_team_hail_body() -> dict[str, Any]:
    """Device proof hail for Away Team Google TV (effect-inventory Phase E)."""
    message = "Come in, Away Team"
    return {
        "id": AWAY_TEAM_HAIL_ID,
        "display_id": AWAY_TEAM_DISPLAY_ID,
        "name": AWAY_TEAM_NAME,
        "category": "status",
        "enabled": True,
        "archived": False,
        "message": {"short_text": message, "variants": [message]},
        "icon": {
            "kind": "glyph",
            "value": AWAY_TEAM_GLYPH_ID,
            "label": AWAY_TEAM_NAME,
        },
        "visual": {
            "effect_id": "transporter",
            "effect_variation_id": "spoon",
            "palette_id": "axiom_dark_cyan",
            "scale": "large",
            "duration_ms": 7000,
            "placement_id": "upper_center",
            "placement_mode": "preset",
            "anchor": "top_end",
            "priority_level": "yellow",
            "reduced_motion_fallback": "static_toast",
            "effect_footprint_profile": "standard",
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
        "delivery_policy": {
            "routes": [
                {
                    "id": AWAY_TEAM_ROUTE_ID,
                    "launch_room_id": "arcade",
                    "destination_room_id": "away_team",
                    "provider": "lcard",
                    "requires_confirmation": False,
                    "enabled": True,
                }
            ],
        },
    }


def upsert_away_team_hail(
    current_hails: list[dict[str, Any]],
    *,
    custom_glyphs: dict[str, dict[str, Any]] | None = None,
) -> tuple[dict[str, Any], str]:
    body = build_away_team_hail_body()
    glyphs = away_team_custom_glyphs(custom_glyphs)
    allowlist = effective_hail_glyph_allowlist_for_custom(glyphs)
    existing = next(
        (h for h in current_hails if str(h.get("id") or "").strip() == AWAY_TEAM_HAIL_ID),
        None,
    )
    if existing is None:
        return (
            create_hail(
                body,
                current_hails,
                glyph_allowlist=allowlist,
                custom_glyphs=glyphs,
            ),
            "created",
        )
    return (
        update_hail(
            AWAY_TEAM_HAIL_ID,
            body,
            current_hails,
            glyph_allowlist=allowlist,
            custom_glyphs=glyphs,
        ),
        "updated",
    )

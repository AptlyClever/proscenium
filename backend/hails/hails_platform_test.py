"""Platform Test Hail — canonical smoke fixture built from current domain defaults."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from hails.hail_glyph_combadge import COMBADGE_DELTA_V1
from hails.hails_composer import effective_hail_glyph_allowlist_for_custom, build_fixture_glyph_spec
from hails.hails_domain import (
    _DEFAULT_ADVANCED,
    _DEFAULT_AUDIO,
    _DEFAULT_BEHAVIOR,
    _DEFAULT_VISUAL,
    create_hail,
    update_hail,
)
from hails.hails_message_sidekick import default_message_sidekick_id
from hails.hails_render_contract import load_hail_render_contract_for_generation

PLATFORM_TEST_HAIL_ID = "hail.platform_test.001"
PLATFORM_TEST_DISPLAY_ID = "TST"
PLATFORM_TEST_NAME = "Test"
PLATFORM_TEST_CATEGORY = "status"
PLATFORM_TEST_GLYPH_ID = "custom-platform-test"
PLATFORM_TEST_GLYPH_FAMILY = COMBADGE_DELTA_V1
PLATFORM_TEST_GLYPH_SEED = 90618001
PLATFORM_TEST_ROUTE_ID = "route.arcade.arcade.001"
PLATFORM_TEST_AWAY_ROUTE_ID = "route.arcade.away_team.001"


def build_platform_test_glyph_spec() -> dict[str, Any]:
    """Deterministic Characters-kind hero for platform smoke — no Forge UI required."""
    return build_fixture_glyph_spec(
        glyph_name="Platform",
        glyph_id=PLATFORM_TEST_GLYPH_ID,
        glyph_family_id=PLATFORM_TEST_GLYPH_FAMILY,
        seed=PLATFORM_TEST_GLYPH_SEED,
        variation_only=True,
        scale="medium",
        palette_id="axiom_dark_cyan",
        effect_id="transporter",
    )


def platform_test_custom_glyphs(
    custom_glyphs: dict[str, dict[str, Any]] | None = None,
) -> dict[str, dict[str, Any]]:
    """Merge platform test glyph into a custom_glyphs map for domain saves."""
    spec = build_platform_test_glyph_spec()
    merged = dict(custom_glyphs or {})
    merged[spec["glyph_id"]] = spec
    return merged


def build_platform_test_hail_body(
    *,
    rebuilt_at: datetime | None = None,
    priority_level: str = "green",
) -> dict[str, Any]:
    """Return a full hail record body for upsert — always current platform defaults."""
    when = rebuilt_at or datetime.now(timezone.utc)
    stamp = when.replace(microsecond=0).strftime("%Y-%m-%d %H:%M UTC")
    short_text = f"Test hail ({priority_level}) — {stamp}"

    contract = load_hail_render_contract_for_generation("v002-beta")
    sidekick_id = default_message_sidekick_id(contract)
    visual = {
        **_DEFAULT_VISUAL,
        "effect_id": "transporter",
        "effect_variation_id": "voyaging",
        "message_sidekick_id": sidekick_id,
        "priority_level": priority_level,
    }

    return {
        "id": PLATFORM_TEST_HAIL_ID,
        "display_id": PLATFORM_TEST_DISPLAY_ID,
        "name": PLATFORM_TEST_NAME,
        "category": PLATFORM_TEST_CATEGORY,
        "enabled": True,
        "archived": False,
        "message": {"short_text": short_text, "variants": [short_text]},
        "icon": {
            "kind": "glyph",
            "value": PLATFORM_TEST_GLYPH_ID,
            "label": PLATFORM_TEST_NAME,
        },
        "visual": visual,
        "audio": dict(_DEFAULT_AUDIO),
        "behavior": dict(_DEFAULT_BEHAVIOR),
        "advanced": dict(_DEFAULT_ADVANCED),
        "delivery_policy": {
            "routes": [
                {
                    "id": PLATFORM_TEST_ROUTE_ID,
                    "launch_room_id": "arcade",
                    "destination_room_id": "arcade",
                    "provider": "lcard",
                    "requires_confirmation": False,
                    "enabled": True,
                },
                {
                    "id": PLATFORM_TEST_AWAY_ROUTE_ID,
                    "launch_room_id": "arcade",
                    "destination_room_id": "away_team",
                    "provider": "lcard",
                    "requires_confirmation": False,
                    "enabled": True,
                },
            ],
        },
    }


def upsert_platform_test_hail(
    current_hails: list[dict[str, Any]],
    *,
    custom_glyphs: dict[str, dict[str, Any]] | None = None,
    rebuilt_at: datetime | None = None,
    priority_level: str = "green",
) -> tuple[dict[str, Any], str]:
    """Create or update the platform Test hail in-memory (domain layer). Returns (record, action)."""
    body = build_platform_test_hail_body(rebuilt_at=rebuilt_at, priority_level=priority_level)
    glyphs = platform_test_custom_glyphs(custom_glyphs)
    allowlist = effective_hail_glyph_allowlist_for_custom(glyphs)
    existing = next(
        (h for h in current_hails if str(h.get("id") or "").strip() == PLATFORM_TEST_HAIL_ID),
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
            PLATFORM_TEST_HAIL_ID,
            body,
            current_hails,
            glyph_allowlist=allowlist,
            custom_glyphs=glyphs,
        ),
        "updated",
    )

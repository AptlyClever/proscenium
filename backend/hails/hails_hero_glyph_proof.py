"""Hero Glyph proof hail — package pipeline fixture for north-star character."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from hails.hail_glyph_character import HERO_GLYPH_PROOF_GLYPH_ID, build_hero_glyph_proof_spec
from hails.hails_composer import effective_hail_glyph_allowlist_for_custom
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

HERO_GLYPH_PROOF_HAIL_ID = "hail.hero_glyph_proof.001"
HERO_GLYPH_PROOF_DISPLAY_ID = "HGP"
HERO_GLYPH_PROOF_NAME = "Hero Glyph Proof"
HERO_GLYPH_PROOF_ROUTE_ID = "route.arcade.arcade.hero_glyph_proof"


def hero_glyph_proof_custom_glyphs(
    custom_glyphs: dict[str, dict[str, Any]] | None = None,
) -> dict[str, dict[str, Any]]:
    spec = build_hero_glyph_proof_spec()
    merged = dict(custom_glyphs or {})
    merged[spec["glyph_id"]] = spec
    return merged


def build_hero_glyph_proof_hail_body(*, rebuilt_at: datetime | None = None) -> dict[str, Any]:
    when = rebuilt_at or datetime.now(timezone.utc)
    stamp = when.replace(microsecond=0).strftime("%Y-%m-%d %H:%M UTC")
    short_text = f"Hero Glyph proof — {stamp}"

    contract = load_hail_render_contract_for_generation("v002-beta")
    sidekick_id = default_message_sidekick_id(contract)
    visual = {
        **_DEFAULT_VISUAL,
        "effect_id": "transporter",
        "effect_variation_id": "voyaging",
        "message_sidekick_id": sidekick_id,
        "priority_level": "green",
    }

    return {
        "id": HERO_GLYPH_PROOF_HAIL_ID,
        "display_id": HERO_GLYPH_PROOF_DISPLAY_ID,
        "name": HERO_GLYPH_PROOF_NAME,
        "category": "status",
        "enabled": True,
        "archived": False,
        "message": {"short_text": short_text, "variants": [short_text]},
        "icon": {
            "kind": "glyph",
            "value": HERO_GLYPH_PROOF_GLYPH_ID,
            "label": HERO_GLYPH_PROOF_NAME,
        },
        "visual": visual,
        "audio": dict(_DEFAULT_AUDIO),
        "behavior": dict(_DEFAULT_BEHAVIOR),
        "advanced": dict(_DEFAULT_ADVANCED),
        "delivery_policy": {
            "routes": [
                {
                    "id": HERO_GLYPH_PROOF_ROUTE_ID,
                    "launch_room_id": "arcade",
                    "destination_room_id": "arcade",
                    "provider": "lcard",
                    "requires_confirmation": False,
                    "enabled": True,
                },
            ],
        },
    }


def upsert_hero_glyph_proof_hail(
    current_hails: list[dict[str, Any]],
    *,
    custom_glyphs: dict[str, dict[str, Any]] | None = None,
    rebuilt_at: datetime | None = None,
) -> tuple[dict[str, Any], str]:
    body = build_hero_glyph_proof_hail_body(rebuilt_at=rebuilt_at)
    glyphs = hero_glyph_proof_custom_glyphs(custom_glyphs)
    allowlist = effective_hail_glyph_allowlist_for_custom(glyphs)
    existing = next(
        (h for h in current_hails if str(h.get("id") or "").strip() == HERO_GLYPH_PROOF_HAIL_ID),
        None,
    )
    if existing:
        record = update_hail(
            HERO_GLYPH_PROOF_HAIL_ID,
            body,
            current_hails,
            glyph_allowlist=allowlist,
            custom_glyphs=glyphs,
        )
        return record, "updated"
    record = create_hail(
        body,
        current_hails,
        glyph_allowlist=allowlist,
        custom_glyphs=glyphs,
    )
    return record, "created"

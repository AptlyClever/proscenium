"""Fleet glyph hero audit — upgrade-or-remove enforcement."""

from __future__ import annotations

from typing import Any

from hails.hails_glyph_render import resolve_glyph_render

_LEGACY_REGISTRY_GLYPHS = frozenset(
    {
        "default",
        "hail-summons",
        "hail-alert",
        "hail-route",
        "hail-beacon",
    }
)

_CANONICAL_HERO_GLYPH_IDS = frozenset(
    {
        "custom-platform-test",
        "custom-spoon-transporter",
        "custom-away-team",
    }
)


def _trim(value: Any) -> str:
    return value.strip() if isinstance(value, str) else ""


def hail_glyph_id(hail: dict[str, Any]) -> str:
    icon = hail.get("icon") if isinstance(hail.get("icon"), dict) else {}
    return _trim(icon.get("value"))


def audit_fleet_glyph_heroes(
    hails: list[dict[str, Any]],
    *,
    custom_glyphs: dict[str, dict[str, Any]] | None = None,
    exempt_hail_ids: frozenset[str] | None = None,
) -> list[dict[str, str]]:
    """Return audit rows for active hails that violate hero glyph policy."""
    library = custom_glyphs or {}
    exempt = exempt_hail_ids or frozenset()
    rows: list[dict[str, str]] = []

    for hail in hails:
        if hail.get("archived") is True or hail.get("enabled") is False:
            continue
        hail_id = _trim(hail.get("id"))
        if not hail_id or hail_id in exempt:
            continue

        glyph_id = hail_glyph_id(hail)
        if not glyph_id:
            rows.append(
                {
                    "hail_id": hail_id,
                    "glyph_id": "",
                    "issue": "missing_glyph_id",
                    "recommendation": "upgrade",
                }
            )
            continue

        if glyph_id in _LEGACY_REGISTRY_GLYPHS:
            rows.append(
                {
                    "hail_id": hail_id,
                    "glyph_id": glyph_id,
                    "issue": "legacy_registry_glyph",
                    "recommendation": "upgrade_or_remove",
                }
            )
            continue

        if glyph_id.startswith("custom-"):
            spec = library.get(glyph_id)
            if not isinstance(spec, dict):
                rows.append(
                    {
                        "hail_id": hail_id,
                        "glyph_id": glyph_id,
                        "issue": "missing_custom_glyph_spec",
                        "recommendation": "upgrade",
                    }
                )
                continue
            render = resolve_glyph_render(glyph_id, custom_glyphs=library)
            if render.get("kind") != "procedural":
                rows.append(
                    {
                        "hail_id": hail_id,
                        "glyph_id": glyph_id,
                        "issue": "custom_glyph_not_procedural",
                        "recommendation": "upgrade",
                    }
                )

    return rows


def canonical_hero_glyph_ids() -> frozenset[str]:
    return _CANONICAL_HERO_GLYPH_IDS

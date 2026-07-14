"""Forge operator glyph family resolution — deterministic, no roulette.

Composer / Forge seeds and Re-encode must not roll kind, slot, or icon families.
Keywords pick a shaped generator via subject recipe registry; otherwise fleet default.
Grammar-lab families require an explicit glyph_family_id.
"""

from __future__ import annotations

from hails.hail_glyph_combadge import COMBADGE_DELTA_V1
from hails.hail_glyph_procedural import is_grammar_lab_family_id, is_operator_kind_family_id
from hails.hail_glyph_subject_registry import resolve_recipe_id

# Shaped prop default — not guardian blob, not slot/icon roulette.
OPERATOR_SHAPED_DEFAULT_FAMILY: str = COMBADGE_DELTA_V1


def pick_operator_family_id(
    *,
    glyph_name: str = "",
    hail_name: str = "",
    glyph_family_id: str | None = None,
) -> str:
    """Resolve generator family for Forge operator seeds (no random roll)."""
    explicit = (glyph_family_id or "").strip()
    if explicit and (is_operator_kind_family_id(explicit) or is_grammar_lab_family_id(explicit)):
        return explicit

    resolved = resolve_recipe_id(glyph_name, hail_name, explicit_family=explicit or None)
    if resolved:
        return resolved

    return OPERATOR_SHAPED_DEFAULT_FAMILY

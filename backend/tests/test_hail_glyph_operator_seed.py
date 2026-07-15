"""Operator seed path — no kind/slot/icon roulette."""

from __future__ import annotations

import hashlib

from hails.hail_glyph_combadge import COMBADGE_DELTA_V1
from hails.hail_glyph_operator_seed import OPERATOR_SHAPED_DEFAULT_FAMILY, pick_operator_family_id
from hails.hail_glyph_procedural import generate_procedural_graph


def _digest(*parts: str) -> bytes:
    return hashlib.sha256("|".join(parts).encode("utf-8")).digest()


def test_neutral_name_defaults_to_shaped_combadge() -> None:
    digest = _digest("neutral", "operator")
    graph, _ = generate_procedural_graph(glyph_name="Glyph", hail_name="", seed=1, digest=digest)
    assert graph["generator_id"] == COMBADGE_DELTA_V1


def test_operator_pick_is_deterministic() -> None:
    assert pick_operator_family_id(glyph_name="Anything") == OPERATOR_SHAPED_DEFAULT_FAMILY
    assert pick_operator_family_id(glyph_name="Star Trek") == COMBADGE_DELTA_V1


def test_reencode_locks_family() -> None:
    digest = _digest("lock", "family")
    first, _ = generate_procedural_graph(
        glyph_name="Star Trek",
        hail_name="",
        seed=1,
        digest=digest,
        glyph_family_id=COMBADGE_DELTA_V1,
        variation_only=True,
    )
    second, _ = generate_procedural_graph(
        glyph_name="Star Trek",
        hail_name="",
        seed=2,
        digest=digest,
        glyph_family_id=COMBADGE_DELTA_V1,
        variation_only=True,
    )
    assert first["generator_id"] == COMBADGE_DELTA_V1
    assert second["generator_id"] == COMBADGE_DELTA_V1
    assert first["signature"] != second["signature"]

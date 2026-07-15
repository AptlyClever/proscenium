"""Tests for parametric procedural custom glyph generation."""

from __future__ import annotations

import hashlib

from hails.hail_glyph_procedural import (
    PROCEDURAL_MOTIF_IDS,
    generate_procedural_graph,
    is_valid_procedural_graph,
    is_valid_procedural_motif_id,
    resolve_semantic_bucket,
)


def _digest(*parts: str) -> bytes:
    return hashlib.sha256("|".join(parts).encode("utf-8")).digest()


def test_resolve_semantic_bucket_sense_keywords() -> None:
    digest = _digest("seed")
    assert resolve_semantic_bucket("Hail Watch", "Can I see this", digest) == "sense"


def test_resolve_semantic_bucket_motion_keywords() -> None:
    digest = _digest("transporter")
    assert resolve_semantic_bucket("Route Transporter", "", digest) == "motion"


def test_resolve_semantic_bucket_neutral_when_no_hits() -> None:
    digest = _digest("neutral")
    assert resolve_semantic_bucket("Alpha Beta", "", digest) == "neutral"


def test_resolve_semantic_bucket_glyph_name_overrides_hail_sense() -> None:
    digest = _digest("party")
    assert resolve_semantic_bucket("Party", "Can I see this", digest) == "spark"


def test_resolve_semantic_bucket_generic_glyph_uses_hail() -> None:
    digest = _digest("see")
    assert resolve_semantic_bucket("New Glyph", "Can I see this", digest) == "sense"


def test_generate_procedural_graph_deterministic() -> None:
    digest = _digest("Party Spark", "Can I see this")
    a, bucket_a = generate_procedural_graph(
        glyph_name="Party Spark",
        hail_name="Can I see this",
        seed=None,
        digest=digest,
    )
    b, bucket_b = generate_procedural_graph(
        glyph_name="Party Spark",
        hail_name="Can I see this",
        seed=None,
        digest=digest,
    )
    assert a == b
    assert bucket_a == bucket_b == "spark"
    assert is_valid_procedural_graph(a)
    assert len(a["paths"]) >= 1


def test_generate_procedural_graph_seed_produces_many_unique_signatures() -> None:
    digest = _digest("neutral", "variation")
    signatures = {
        generate_procedural_graph(
            glyph_name="Alpha",
            hail_name="Beta",
            seed=seed,
            digest=digest,
        )[0]["signature"]
        for seed in range(1, 40)
    }
    assert len(signatures) >= 8


def test_generate_procedural_graph_operator_keywords_pick_shaped_families() -> None:
    """Registry keyword triggers pick distinct shaped recipes; unregistered
    subjects fall to the shaped operator default (glyph-subject-recipe-v001)."""
    digest = _digest("open", "composer")
    from hails.hail_glyph_character import HERO_GLYPH_PROOF_FAMILY_ID
    from hails.hail_glyph_combadge import COMBADGE_DELTA_V1

    trek, _ = generate_procedural_graph(glyph_name="Star Trek", hail_name="", seed=1, digest=digest)
    guardian, _ = generate_procedural_graph(glyph_name="Guardian", hail_name="", seed=1, digest=digest)
    neutral, _ = generate_procedural_graph(glyph_name="Alpha", hail_name="", seed=1, digest=digest)
    assert trek["generator_id"] == COMBADGE_DELTA_V1
    assert guardian["generator_id"] == HERO_GLYPH_PROOF_FAMILY_ID
    assert neutral["generator_id"] == COMBADGE_DELTA_V1
    assert guardian["generator_id"] != trek["generator_id"]


def test_variation_only_keeps_family() -> None:
    digest = _digest("Star Trek", "")
    first, _ = generate_procedural_graph(glyph_name="Star Trek", hail_name="", seed=1, digest=digest)
    family = first["generator_id"]
    second, _ = generate_procedural_graph(
        glyph_name="Star Trek",
        hail_name="",
        seed=2,
        digest=digest,
        glyph_family_id=family,
        variation_only=True,
    )
    assert second["generator_id"] == family
    assert first["signature"] != second["signature"]


def test_sense_bucket_routes_kind_not_slot_bias() -> None:
    from hails.hail_glyph_character import CHARACTER_RECIPE_IDS
    from hails.hail_glyph_people import PERSON_RECIPE_IDS
    from hails.hail_glyph_places import PLACE_RECIPE_IDS
    from hails.hail_glyph_slots import SLOT_RECIPE_IDS

    digest = _digest("presence", "Can I see this")
    ids = {
        generate_procedural_graph(
            glyph_name="Presence",
            hail_name="Can I see this",
            seed=seed,
            digest=digest,
        )[0]["generator_id"]
        for seed in range(1, 160)
    }
    kind_ids = set(CHARACTER_RECIPE_IDS) | set(PLACE_RECIPE_IDS) | set(PERSON_RECIPE_IDS)
    assert ids & kind_ids
    assert not ids.issubset(set(SLOT_RECIPE_IDS))


def test_generate_procedural_graph_name_changes_signature() -> None:
    a, _ = generate_procedural_graph(
        glyph_name="Star Trek",
        hail_name="",
        seed=1,
        digest=_digest("Star Trek", ""),
    )
    b, _ = generate_procedural_graph(
        glyph_name="Guardian",
        hail_name="",
        seed=1,
        digest=_digest("Guardian", ""),
        glyph_family_id="char_chunky_guardian_v1",
    )
    assert a["signature"] != b["signature"]


def test_compose_from_primitives_always_has_paths() -> None:
    digest = _digest("dots")
    for seed in range(1, 80):
        graph, _ = generate_procedural_graph(glyph_name="see", hail_name="", seed=seed, digest=digest)
        assert is_valid_procedural_graph(graph), f"seed {seed} invalid: {graph!r}"
        assert len(graph["paths"]) >= 2


def test_is_valid_procedural_motif_id_legacy() -> None:
    assert is_valid_procedural_motif_id("arc-mark")
    assert not is_valid_procedural_motif_id("emoji-smile")
    assert "arc-mark" in PROCEDURAL_MOTIF_IDS


def test_is_valid_procedural_graph_rejects_nonnumeric_version() -> None:
    assert not is_valid_procedural_graph({"version": "v1", "paths": [{"d": "M10 10 L90 90"}]})
    assert not is_valid_procedural_graph({"version": True, "paths": [{"d": "M10 10 L90 90"}]})


def test_generate_procedural_graph_normalizes_out_of_range_seed() -> None:
    digest = _digest("seed-bounds")
    a, _ = generate_procedural_graph(glyph_name="Test", hail_name="", seed=-1, digest=digest)
    b, _ = generate_procedural_graph(
        glyph_name="Test",
        hail_name="",
        seed=0xFFFFFFFF,
        digest=digest,
    )
    assert a == b
    assert is_valid_procedural_graph(a)

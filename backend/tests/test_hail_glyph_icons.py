"""Tests for icon/object glyph generator."""

from __future__ import annotations

import hashlib

from hails.hail_glyph_icons import (
    ICON_RECIPE_IDS,
    icon_kind_probability,
    is_icon_recipe_id,
    pick_icon_recipe_id,
    render_icon_recipe,
    resolve_keyword_icon_match,
)
from hails.hail_glyph_procedural import generate_procedural_graph


def _digest(*parts: str) -> bytes:
    return hashlib.sha256("|".join(parts).encode("utf-8")).digest()


class _StubRng:
    def __init__(self, values: list[int]) -> None:
        self._values = values
        self._index = 0

    def _next(self) -> int:
        value = self._values[self._index % len(self._values)]
        self._index += 1
        return value

    def pick_weighted(self, items: tuple[str, ...], weights: tuple[int, ...]) -> str:
        total = sum(weights)
        roll = self._next() % total
        acc = 0
        for item, weight in zip(items, weights, strict=True):
            acc += weight
            if roll < acc:
                return item
        return items[-1]

    def stroke_width(self, primary: bool = True) -> float:
        return 2.5


def test_icon_recipe_ids_are_addressable() -> None:
    assert len(ICON_RECIPE_IDS) >= 28
    assert all(is_icon_recipe_id(recipe_id) for recipe_id in ICON_RECIPE_IDS)


def test_expanded_pictograms_render() -> None:
    new_icons = (
        "moon",
        "sun",
        "clock",
        "phone",
        "tv",
        "utensils",
        "car",
        "key",
        "book",
        "search",
        "check",
        "paw",
        "gear",
        "wifi",
        "gift",
        "coffee",
    )
    for icon_id in new_icons:
        paths, circles, composition = render_icon_recipe(f"icon_{icon_id}", _StubRng([0]))
        assert paths, icon_id
        assert not circles
        assert composition["representation"]["icon_id"] == icon_id


def test_meal_and_sleep_keywords() -> None:
    assert resolve_keyword_icon_match("Lunch Break", "")[0] == "utensils"
    assert resolve_keyword_icon_match("Bedtime Nap", "")[0] == "moon"
    assert resolve_keyword_icon_match("Coffee Morning", "")[0] == "coffee"
    assert resolve_keyword_icon_match("Netflix Show", "")[0] == "tv"


def test_keyword_match_scores_glyph_name_higher() -> None:
    assert resolve_keyword_icon_match("Download", "") == ("download", 3)
    glyph_heavy = resolve_keyword_icon_match("Download Archive", "Route Home")
    assert glyph_heavy is not None
    assert glyph_heavy[0] == "download"
    assert glyph_heavy[1] >= 3


def test_home_keyword_resolves() -> None:
    match = resolve_keyword_icon_match("Kitchen Family", "")
    assert match is not None
    assert match[0] == "home"
    assert icon_kind_probability(glyph_name="Kitchen Family", hail_name="", bucket="gather") >= 90


def test_keyword_bias_selects_download() -> None:
    rng = _StubRng([10, 5])
    recipe = pick_icon_recipe_id(rng, "motion", glyph_name="Download Archive", hail_name="")
    assert recipe == "icon_download"


def test_render_icon_recipe_has_representation_metadata() -> None:
    paths, circles, composition = render_icon_recipe("icon_home", _StubRng([0]))
    assert paths
    assert not circles
    representation = composition.get("representation")
    assert isinstance(representation, dict)
    assert representation.get("kind") == "icon"
    assert representation.get("icon_id") == "home"


def test_generate_procedural_graph_emits_icons_when_family_explicit() -> None:
    digest = _digest("Icon", "mix")
    kinds: set[str] = set()
    for seed in range(1, 10):
        graph, _ = generate_procedural_graph(
            glyph_name="Party Game",
            hail_name="",
            seed=seed,
            digest=digest,
            glyph_family_id="icon_gamepad",
            variation_only=True,
        )
        generator = graph.get("generator_id", "")
        assert is_icon_recipe_id(str(generator))
        representation = graph.get("representation")
        assert isinstance(representation, dict)
        assert representation.get("kind") == "icon"
        kinds.add(str(representation.get("icon_id")))
    assert kinds


def test_download_name_uses_operator_default_not_icon_roulette() -> None:
    digest = _digest("Download", "route")
    from hails.hail_glyph_combadge import COMBADGE_DELTA_V1

    graph, _ = generate_procedural_graph(
        glyph_name="Download Route",
        hail_name="",
        seed=1,
        digest=digest,
    )
    assert graph["generator_id"] == COMBADGE_DELTA_V1


def test_remix_varies_signature_within_locked_icon_family() -> None:
    digest = _digest("Coffee", "morning")
    generators = {
        generate_procedural_graph(
            glyph_name="Coffee Morning",
            hail_name="",
            seed=s,
            digest=digest,
            glyph_family_id="icon_coffee",
            variation_only=True,
            remix=True,
        )[0]["generator_id"]
        for s in range(1, 24)
    }
    assert generators == {"icon_coffee"}


def test_remix_spreads_signatures_for_same_icon() -> None:
    digest = _digest("Remix", "combadge")
    from hails.hail_glyph_combadge import COMBADGE_DELTA_V1

    signatures = {
        generate_procedural_graph(
            glyph_name="Star Trek",
            hail_name="",
            seed=s,
            digest=digest,
            glyph_family_id=COMBADGE_DELTA_V1,
            variation_only=True,
            remix=True,
        )[0]["signature"]
        for s in range(1, 20)
    }
    assert len(signatures) >= 2


def test_remix_icon_pick_biases_without_locking() -> None:
    picks = {
        pick_icon_recipe_id(_StubRng([n, n + 3]), "spark", glyph_name="Coffee Morning", hail_name="", remix=True)
        for n in range(0, 80, 4)
    }
    assert len(picks) >= 3
    coffee_hits = sum(1 for pick in picks if pick == "icon_coffee")
    assert coffee_hits >= 1
    assert coffee_hits < len(picks)
    digest = _digest("Generic", "mix")
    icons = 0
    for seed in range(1, 40):
        graph, _ = generate_procedural_graph(glyph_name="Fleet Mark", hail_name="", seed=seed, digest=digest)
        if is_icon_recipe_id(str(graph.get("generator_id", ""))):
            icons += 1
    assert icons == 0

"""Places Kind generators — geographic / landmark silhouettes (proto Fleet Soul)."""

from __future__ import annotations

from typing import Any, Final, Protocol

from hails.hail_glyph_composition import is_valid_composition

PLACE_PREFIX: Final[str] = "place_"
PLACE_STATE_OUTLINE_V1: Final[str] = "place_state_outline_v1"

PLACE_RECIPE_IDS: Final[tuple[str, ...]] = (PLACE_STATE_OUTLINE_V1,)


class _PlaceRng(Protocol):
    def _next(self) -> int: ...
    def stroke_width(self, primary: bool = True) -> float: ...


def _path(
    d: str,
    *,
    stroke_width: float = 2.6,
    fill: str = "none",
    opacity: float = 1.0,
    role: str | None = None,
) -> dict[str, Any]:
    row: dict[str, Any] = {
        "d": d,
        "stroke": "currentColor",
        "stroke_width": stroke_width,
        "fill": fill,
        "opacity": opacity,
        "stroke_linecap": "round",
        "stroke_linejoin": "round",
    }
    if role:
        row["role"] = role
    return row


def is_place_recipe_id(value: str) -> bool:
    trimmed = (value or "").strip()
    return trimmed.startswith(PLACE_PREFIX) and trimmed in PLACE_RECIPE_IDS


def pick_place_recipe_id(rng: _PlaceRng) -> str:
    del rng
    return PLACE_STATE_OUTLINE_V1


def _state_outline_paths(rng: _PlaceRng, *, variation_only: bool) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    sw = max(2.5, rng.stroke_width(True))
    if variation_only:
        sw = round(min(3.2, sw + (rng._next() % 4) * 0.05), 2)
    # Rounded state-like hull — one outer silhouette (Places Kind).
    hull = _path(
        "M24 14 L31 16.5 L34 24 L30.5 32 L17.5 32 L14 24 L17 16.5 Z",
        stroke_width=sw,
        fill="currentColor",
        opacity=0.9,
        role="mass",
    )
    mark = _path(
        "M24 20 L26.5 25 L24 28 L21.5 25 Z",
        stroke_width=max(2.4, sw - 0.1),
        fill="currentColor",
        opacity=1.0,
        role="charge",
    )
    return [hull, mark], []


def render_place_recipe(
    recipe_id: str,
    rng: _PlaceRng,
    *,
    variation_only: bool = False,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]], dict[str, Any]]:
    family = (recipe_id or "").strip()
    if family != PLACE_STATE_OUTLINE_V1:
        family = PLACE_STATE_OUTLINE_V1
    for _ in range(4):
        paths, circles = _state_outline_paths(rng, variation_only=variation_only)
        if is_valid_composition(paths, circles):
            composition: dict[str, Any] = {
                "schema": "place_v1",
                "place_template": "state_outline",
                "lead_phrase": "state mark",
                "kind": "place",
                "anchor": {"cx": 24, "cy": 24},
            }
            return paths, circles, composition
    paths, circles = _state_outline_paths(rng, variation_only=False)
    composition = {
        "schema": "place_v1",
        "place_template": "state_outline",
        "lead_phrase": "state mark",
        "kind": "place",
        "anchor": {"cx": 24, "cy": 24},
    }
    return paths, circles, composition

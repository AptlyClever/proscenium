"""People Kind generators — abstract portrait masks (proto Fleet Soul; no likeness v1)."""

from __future__ import annotations

from typing import Any, Final, Protocol

from hails.hail_glyph_composition import is_valid_composition

PERSON_PREFIX: Final[str] = "person_"
PERSON_MASK_V1: Final[str] = "person_mask_v1"

PERSON_RECIPE_IDS: Final[tuple[str, ...]] = (PERSON_MASK_V1,)


class _PersonRng(Protocol):
    def _next(self) -> int: ...
    def stroke_width(self, primary: bool = True) -> float: ...


def _path(
    d: str,
    *,
    stroke_width: float = 2.5,
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


def is_person_recipe_id(value: str) -> bool:
    trimmed = (value or "").strip()
    return trimmed.startswith(PERSON_PREFIX) and trimmed in PERSON_RECIPE_IDS


def pick_person_recipe_id(rng: _PersonRng) -> str:
    del rng
    return PERSON_MASK_V1


def _portrait_mask_paths(rng: _PersonRng, *, variation_only: bool) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    sw_head = max(2.6, rng.stroke_width(True))
    sw_face = max(2.4, sw_head)
    if variation_only:
        jitter = (rng._next() % 4) * 0.04
        sw_head = round(min(3.2, sw_head + jitter), 2)
        sw_face = round(max(2.3, sw_face + jitter), 2)
    head = _path(
        "M24 15.5 C30 15.5 34 19.5 34 25.5 C34 31 30 35 24 35 "
        "C18 35 14 31 14 25.5 C14 19.5 18 15.5 24 15.5",
        stroke_width=sw_head,
        fill="currentColor",
        opacity=0.92,
        role="mass",
    )
    face = _path(
        "M18.5 23 L21.5 23 M26.5 23 L29.5 23 M20.5 27.5 Q24 30 27.5 27.5",
        stroke_width=sw_face,
        opacity=1.0,
        role="charge",
    )
    return [head, face], []


def render_person_recipe(
    recipe_id: str,
    rng: _PersonRng,
    *,
    variation_only: bool = False,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]], dict[str, Any]]:
    family = (recipe_id or "").strip()
    if family != PERSON_MASK_V1:
        family = PERSON_MASK_V1
    for _ in range(4):
        paths, circles = _portrait_mask_paths(rng, variation_only=variation_only)
        if is_valid_composition(paths, circles):
            composition: dict[str, Any] = {
                "schema": "person_v1",
                "person_template": "portrait_mask",
                "lead_phrase": "portrait mask",
                "kind": "person",
                "anchor": {"cx": 24, "cy": 24},
            }
            return paths, circles, composition
    paths, circles = _portrait_mask_paths(rng, variation_only=False)
    composition = {
        "schema": "person_v1",
        "person_template": "portrait_mask",
        "lead_phrase": "portrait mask",
        "kind": "person",
        "anchor": {"cx": 24, "cy": 24},
    }
    return paths, circles, composition

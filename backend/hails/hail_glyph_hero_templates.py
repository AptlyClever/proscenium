"""H2 interim hero templates — single-stroke Forge seeder (TRANSITIONAL).

SUPERSEDED for new work by docs/hails/glyph-composition-direction-v001.md (H3 composed
emblem composer). Do not add templates or invest in tuning here — replace with H3.

Ships until H3 lands. Not copies of legacy registry/test glyphs.
"""

from __future__ import annotations

from typing import Any, Callable, Final, Protocol

# First H2 ids — alias to current archetypes for saved custom glyphs only.
DEPRECATED_HERO_ALIASES: Final[dict[str, str]] = {
    "hero_spire_legacy": "hero_spire",
    "hero_eye": "hero_orb",
    "hero_summons": "hero_spire",
    "hero_alert": "hero_wedge",
    "hero_route": "hero_arch",
    "hero_beacon": "hero_orb",
    "hero_crest": "hero_lozenge",
}

HERO_TEMPLATE_IDS: Final[tuple[str, ...]] = (
    "hero_orb",
    "hero_lozenge",
    "hero_spire",
    "hero_wedge",
    "hero_loop",
    "hero_flame",
    "hero_arch",
)

_BUCKET_HERO_BIAS: dict[str, tuple[str, ...]] = {
    "sense": ("hero_loop", "hero_orb", "hero_arch"),
    "motion": ("hero_wedge", "hero_arch", "hero_flame"),
    "signal": ("hero_spire", "hero_flame", "hero_wedge"),
    "gather": ("hero_orb", "hero_lozenge"),
    "spark": ("hero_flame", "hero_lozenge", "hero_loop"),
    "neutral": ("hero_lozenge", "hero_orb", "hero_spire", "hero_arch"),
}

_HERO_WEIGHT: Final[int] = 3
_DEFAULT_HERO_WEIGHT: Final[int] = 1


class _HeroRng(Protocol):
    def randint(self, lo: int, hi: int) -> int: ...
    def chance(self, pct: int) -> bool: ...
    def pick_weighted(self, items: tuple[str, ...], weights: tuple[int, ...]) -> str: ...
    def stroke_width(self, primary: bool = True) -> float: ...
    def _next(self) -> int: ...


def _path(
    d: str,
    *,
    stroke: str = "currentColor",
    stroke_width: float = 2.5,
    fill: str = "none",
    opacity: float = 1.0,
    stroke_linecap: str = "round",
    stroke_linejoin: str | None = None,
) -> dict[str, Any]:
    row: dict[str, Any] = {
        "d": d,
        "stroke": stroke,
        "stroke_width": stroke_width,
        "fill": fill,
        "opacity": opacity,
        "stroke_linecap": stroke_linecap,
    }
    if stroke_linejoin:
        row["stroke_linejoin"] = stroke_linejoin
    return row


def _circle(cx: int, cy: int, r: float, *, fill: str = "currentColor", opacity: float = 0.9) -> dict[str, Any]:
    return {"cx": cx, "cy": cy, "r": r, "fill": fill, "opacity": opacity}


def _resolve_template_id(family_id: str) -> str:
    trimmed = (family_id or "").strip()
    return DEPRECATED_HERO_ALIASES.get(trimmed, trimmed)


def is_hero_template_id(value: str) -> bool:
    trimmed = _resolve_template_id((value or "").strip())
    return trimmed in HERO_TEMPLATE_IDS


def _hero_orb(rng: _HeroRng) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    cx = rng.randint(22, 26)
    cy = rng.randint(22, 26)
    r = round(7.5 + (rng._next() % 6) * 0.55, 2)
    sw = round(2.3 + (rng._next() % 2) * 0.2, 2)
    left = round(cx - r, 2)
    paths = [
        _path(
            f"M{left} {cy}a{r} {r} 0 1 1 {r * 2} 0a{r} {r} 0 1 1 -{r * 2} 0",
            stroke_width=sw,
        ),
    ]
    return paths, []


def _hero_lozenge(rng: _HeroRng) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    cx = rng.randint(22, 26)
    cy = rng.randint(22, 26)
    half_w = rng.randint(8, 11)
    half_h = rng.randint(9, 12)
    sw = round(2.3 + (rng._next() % 3) * 0.15, 2)
    paths = [
        _path(
            f"M{cx} {cy - half_h} L{cx + half_w} {cy} L{cx} {cy + half_h} L{cx - half_w} {cy} Z",
            stroke_width=sw,
            stroke_linejoin="round",
        ),
    ]
    return paths, []


def _hero_spire(rng: _HeroRng) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    cx = rng.randint(22, 26)
    top = rng.randint(12, 15)
    bottom = rng.randint(32, 36)
    bulge = rng.randint(5, 8)
    mid_y = rng.randint(21, 25)
    sw = round(2.4 + (rng._next() % 2) * 0.2, 2)
    paths = [
        _path(
            f"M{cx} {top} Q{cx + bulge} {mid_y} {cx} {bottom} Q{cx - bulge} {mid_y} {cx} {top} Z",
            stroke_width=sw,
            stroke_linejoin="round",
        ),
    ]
    return paths, []


def _hero_wedge(rng: _HeroRng) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    cx = rng.randint(22, 26)
    top = rng.randint(14, 18)
    base = rng.randint(30, 34)
    half = rng.randint(9, 12)
    sw = round(2.35 + (rng._next() % 2) * 0.2, 2)
    tilt = rng.randint(-2, 2)
    paths = [
        _path(
            f"M{cx + tilt} {top} L{cx + half} {base} L{cx - half + tilt} {base} Z",
            stroke_width=sw,
            stroke_linejoin="round",
        ),
    ]
    return paths, []


def _hero_loop(rng: _HeroRng) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    cx = rng.randint(22, 26)
    cy = rng.randint(21, 25)
    rx = rng.randint(9, 12)
    ry = rng.randint(6, 8)
    sw = rng.stroke_width()
    left = cx - rx
    paths = [
        _path(
            f"M{left + rx // 2} {cy} C{left} {cy - ry} {left + rx * 2} {cy - ry} {left + rx * 2 - rx // 2} {cy} "
            f"C{left + rx * 2} {cy + ry} {left} {cy + ry} {left + rx // 2} {cy}",
            stroke_width=sw,
            stroke_linecap="round",
        ),
    ]
    return paths, []


def _hero_flame(rng: _HeroRng) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    cx = rng.randint(22, 26)
    base = rng.randint(31, 35)
    peak = rng.randint(11, 14)
    lean = rng.randint(-3, 3)
    sw = round(2.3 + (rng._next() % 2) * 0.2, 2)
    paths = [
        _path(
            f"M{cx} {base} Q{cx + lean + 9} {rng.randint(22, 26)} {cx + lean} {peak} "
            f"Q{cx + lean - 9} {rng.randint(22, 26)} {cx} {base} Z",
            stroke_width=sw,
            stroke_linejoin="round",
        ),
    ]
    return paths, []


def _hero_arch(rng: _HeroRng) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    cx = rng.randint(22, 26)
    base_y = rng.randint(30, 34)
    rise = rng.randint(14, 18)
    half = rng.randint(10, 13)
    sw = round(2.4 + (rng._next() % 2) * 0.2, 2)
    left = cx - half
    paths = [
        _path(
            f"M{left} {base_y} Q{cx} {base_y - rise} {left + half * 2} {base_y}",
            stroke_width=sw,
            stroke_linecap="round",
        ),
    ]
    return paths, []


_HERO_RENDERERS: dict[str, Callable[[_HeroRng], tuple[list[dict[str, Any]], list[dict[str, Any]]]]] = {
    "hero_orb": _hero_orb,
    "hero_lozenge": _hero_lozenge,
    "hero_spire": _hero_spire,
    "hero_wedge": _hero_wedge,
    "hero_loop": _hero_loop,
    "hero_flame": _hero_flame,
    "hero_arch": _hero_arch,
}


def pick_weighted_hero(rng: _HeroRng, bucket: str) -> str:
    biased = set(_BUCKET_HERO_BIAS.get(bucket, _BUCKET_HERO_BIAS["neutral"]))
    weights = tuple(_HERO_WEIGHT if hid in biased else _DEFAULT_HERO_WEIGHT for hid in HERO_TEMPLATE_IDS)
    return rng.pick_weighted(HERO_TEMPLATE_IDS, weights)


def render_hero_template(
    family_id: str,
    rng: _HeroRng,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    resolved = _resolve_template_id(family_id)
    renderer = _HERO_RENDERERS.get(resolved)
    if renderer is None:
        return _hero_lozenge(rng)
    return renderer(rng)


def canonical_hero_family_id(family_id: str) -> str:
    """Map stored family id to current archetype id for graph generator_id."""
    return _resolve_template_id(family_id)

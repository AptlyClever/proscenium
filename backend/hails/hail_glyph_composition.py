"""H3 composed emblem generator — field + charge (+ optional mark).

Replaces H2 single-stroke hero templates for new Forge seeds.
See docs/hails/glyph-composition-direction-v001.md.
"""

from __future__ import annotations

import math
from typing import Any, Callable, Final, Protocol

COMPOSE_FAMILY_IDS: Final[tuple[str, ...]] = (
    "compose_circle_star",
    "compose_lozenge_bolt",
    "compose_shield_chevron",
    "compose_band_spire",
    "compose_ring_flame",
    "compose_arc_crest",
    "compose_orb_tick",
    "compose_square_cross",
    "compose_disc_ray",
)

# Saved hero_* families still render via hail_glyph_hero_templates (legacy path).
HERO_TO_COMPOSE_CANONICAL: Final[dict[str, str]] = {
    "hero_orb": "compose_circle_star",
    "hero_lozenge": "compose_lozenge_bolt",
    "hero_spire": "compose_band_spire",
    "hero_wedge": "compose_shield_chevron",
    "hero_loop": "compose_arc_crest",
    "hero_flame": "compose_ring_flame",
    "hero_arch": "compose_arc_crest",
}

_BUCKET_COMPOSE_BIAS: dict[str, tuple[str, ...]] = {
    "sense": ("compose_arc_crest", "compose_circle_star", "compose_ring_flame", "compose_orb_tick"),
    "motion": ("compose_band_spire", "compose_lozenge_bolt", "compose_shield_chevron"),
    "signal": ("compose_band_spire", "compose_lozenge_bolt", "compose_shield_chevron", "compose_square_cross"),
    "gather": ("compose_circle_star", "compose_arc_crest", "compose_shield_chevron", "compose_orb_tick"),
    "spark": ("compose_ring_flame", "compose_lozenge_bolt", "compose_arc_crest", "compose_disc_ray"),
    "neutral": COMPOSE_FAMILY_IDS,
}

_COMPOSE_WEIGHT: Final[int] = 3
_DEFAULT_COMPOSE_WEIGHT: Final[int] = 1

# TV-distance tuning — field reads as ground, charge reads as hero at Paint Box scale.
_OPTICAL_CENTER: Final[tuple[int, int]] = (24, 24)
_FIELD_OPACITY: Final[float] = 0.38
_CHARGE_OPACITY: Final[float] = 1.0
_CHARGE_SW_DELTA: Final[float] = 0.55
_MARK_DOT_CHANCE: Final[int] = 22


class _ComposeRng(Protocol):
    def randint(self, lo: int, hi: int) -> int: ...
    def chance(self, pct: int) -> bool: ...
    def pick_weighted(self, items: tuple[str, ...], weights: tuple[int, ...]) -> str: ...
    def stroke_width(self, primary: bool = True) -> float: ...
    def _next(self) -> int: ...


def _path(
    d: str,
    *,
    stroke_width: float = 2.5,
    fill: str = "none",
    opacity: float = 1.0,
    stroke_linecap: str = "round",
    stroke_linejoin: str | None = "round",
) -> dict[str, Any]:
    row: dict[str, Any] = {
        "d": d,
        "stroke": "currentColor",
        "stroke_width": stroke_width,
        "fill": fill,
        "opacity": opacity,
        "stroke_linecap": stroke_linecap,
    }
    if stroke_linejoin:
        row["stroke_linejoin"] = stroke_linejoin
    return row


def _circle(cx: int, cy: int, r: float, *, opacity: float = 0.85) -> dict[str, Any]:
    return {"cx": cx, "cy": cy, "r": r, "fill": "currentColor", "opacity": opacity}


def _optical_xy(_rng: _ComposeRng) -> tuple[int, int]:
    return _OPTICAL_CENTER


def _field_stroke(rng: _ComposeRng) -> float:
    return rng.stroke_width(True)


def _charge_stroke(rng: _ComposeRng, field_sw: float) -> float:
    return max(rng.stroke_width(True), field_sw + _CHARGE_SW_DELTA)


def is_compose_family_id(value: str) -> bool:
    return (value or "").strip() in COMPOSE_FAMILY_IDS


def canonical_compose_family_id(family_id: str) -> str:
    trimmed = (family_id or "").strip()
    if trimmed in COMPOSE_FAMILY_IDS:
        return trimmed
    return HERO_TO_COMPOSE_CANONICAL.get(trimmed, trimmed)


def pick_weighted_compose(rng: _ComposeRng, bucket: str) -> str:
    biased = set(_BUCKET_COMPOSE_BIAS.get(bucket, _BUCKET_COMPOSE_BIAS["neutral"]))
    weights = tuple(_COMPOSE_WEIGHT if fid in biased else _DEFAULT_COMPOSE_WEIGHT for fid in COMPOSE_FAMILY_IDS)
    return rng.pick_weighted(COMPOSE_FAMILY_IDS, weights)


def is_valid_composition(paths: list[dict[str, Any]], circles: list[dict[str, Any]]) -> bool:
    """Reject lone primitives and over-budget collages."""
    if len(paths) > 5 or len(circles) > 2:
        return False
    parts = len(paths) + len(circles)
    if parts < 2:
        return False
    if len(paths) == 1 and not circles:
        return False
    return all(isinstance(row.get("d"), str) and row["d"].strip() for row in paths)


def _compose_circle_star(rng: _ComposeRng) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    cx, cy = _optical_xy(rng)
    r_field = rng.randint(9, 11)
    r_star = rng.randint(6, 8)
    sw_field = _field_stroke(rng)
    sw_star = _charge_stroke(rng, sw_field)
    left = round(cx - r_field, 2)
    field = _path(
        f"M{left} {cy}a{r_field} {r_field} 0 1 1 {r_field * 2} 0a{r_field} {r_field} 0 1 1 -{r_field * 2} 0",
        stroke_width=sw_field,
        opacity=_FIELD_OPACITY,
    )
    charge = _path(
        f"M{cx} {cy - r_star} L{cx + r_star} {cy} L{cx} {cy + r_star} L{cx - r_star} {cy} Z",
        stroke_width=sw_star,
        opacity=_CHARGE_OPACITY,
    )
    circles: list[dict[str, Any]] = []
    if rng.chance(_MARK_DOT_CHANCE):
        circles.append(_circle(cx, cy, round(1.0 + (rng._next() % 2) * 0.3, 2), opacity=0.65))
    return [field, charge], circles


def _compose_lozenge_bolt(rng: _ComposeRng) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    cx, cy = _optical_xy(rng)
    hw = rng.randint(9, 11)
    hh = rng.randint(10, 12)
    sw_field = _field_stroke(rng)
    sw_charge = _charge_stroke(rng, sw_field)
    field = _path(
        f"M{cx} {cy - hh} L{cx + hw} {cy} L{cx} {cy + hh} L{cx - hw} {cy} Z",
        stroke_width=sw_field,
        opacity=_FIELD_OPACITY,
    )
    j = rng.randint(3, 5)
    charge = _path(
        f"M{cx} {cy - hh + 3} L{cx + j} {cy - 1} L{cx - 1} {cy + 1} L{cx + j - 1} {cy + hh - 3}",
        stroke_width=sw_charge,
        stroke_linejoin="round",
        opacity=_CHARGE_OPACITY,
    )
    return [field, charge], []


def _compose_shield_chevron(rng: _ComposeRng) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    cx, _ = _optical_xy(rng)
    top = rng.randint(11, 13)
    bottom = rng.randint(33, 35)
    half = rng.randint(9, 11)
    sw_field = _field_stroke(rng)
    sw_charge = _charge_stroke(rng, sw_field)
    field = _path(
        f"M{cx - half} {top + 4} Q{cx} {top} {cx + half} {top + 4} L{cx + half - 1} {bottom - 4} L{cx} {bottom} "
        f"L{cx - half + 1} {bottom - 4} Z",
        stroke_width=sw_field,
        opacity=_FIELD_OPACITY,
    )
    chev_w = rng.randint(6, 8)
    mid = rng.randint(_OPTICAL_CENTER[0], _OPTICAL_CENTER[1])
    charge = _path(
        f"M{cx - chev_w} {mid} L{cx} {mid - chev_w} L{cx + chev_w} {mid}",
        stroke_width=sw_charge,
        opacity=_CHARGE_OPACITY,
    )
    return [field, charge], []


def _compose_band_spire(rng: _ComposeRng) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    cy = rng.randint(24, 26)
    left = rng.randint(10, 12)
    right = rng.randint(36, 38)
    band_h = rng.randint(3, 4)
    sw_field = _field_stroke(rng)
    sw_charge = _charge_stroke(rng, sw_field)
    field = _path(
        f"M{left} {cy - band_h} L{right} {cy - band_h} L{right} {cy + band_h} L{left} {cy + band_h} Z",
        stroke_width=sw_field,
        opacity=_FIELD_OPACITY,
        fill="none",
    )
    cx = rng.randint(_OPTICAL_CENTER[0], _OPTICAL_CENTER[1])
    half_w = rng.randint(5, 7)
    top = cy - rng.randint(11, 13)
    charge = _path(
        f"M{cx - half_w} {cy} Q{cx} {top} {cx + half_w} {cy}",
        stroke_width=sw_charge,
        stroke_linecap="round",
        opacity=_CHARGE_OPACITY,
    )
    return [field, charge], []


def _compose_ring_flame(rng: _ComposeRng) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    cx, cy = _optical_xy(rng)
    cy = min(max(cy, 23), 26)
    r = rng.randint(9, 11)
    sw_field = _field_stroke(rng)
    sw_charge = _charge_stroke(rng, sw_field)
    left = round(cx - r, 2)
    field = _path(
        f"M{left} {cy}a{r} {r} 0 1 1 {r * 2} 0a{r} {r} 0 1 1 -{r * 2} 0",
        stroke_width=sw_field,
        opacity=_FIELD_OPACITY,
    )
    rise = rng.randint(9, 12)
    spread = rng.randint(4, 6)
    charge = _path(
        f"M{cx} {cy + 2} Q{cx - spread} {cy - rise // 2} {cx} {cy - rise} Q{cx + spread} {cy - rise // 2} {cx} {cy + 2}",
        stroke_width=sw_charge,
        stroke_linecap="round",
        opacity=_CHARGE_OPACITY,
    )
    return [field, charge], []


def _compose_arc_crest(rng: _ComposeRng) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    cx, _ = _optical_xy(rng)
    base_y = rng.randint(30, 32)
    peak = rng.randint(13, 15)
    span = rng.randint(13, 15)
    sw_field = _field_stroke(rng)
    sw_charge = _charge_stroke(rng, sw_field)
    field = _path(
        f"M{cx - span} {base_y} Q{cx} {peak} {cx + span} {base_y}",
        stroke_width=sw_field,
        opacity=_FIELD_OPACITY,
        stroke_linecap="round",
    )
    half = rng.randint(5, 7)
    crest_y = rng.randint(20, 22)
    charge = _path(
        f"M{cx} {crest_y - half} L{cx + half} {crest_y} L{cx} {crest_y + half} L{cx - half} {crest_y} Z",
        stroke_width=sw_charge,
        opacity=_CHARGE_OPACITY,
    )
    circles: list[dict[str, Any]] = []
    if rng.chance(_MARK_DOT_CHANCE):
        circles.append(_circle(cx, crest_y, round(1.0 + (rng._next() % 2) * 0.25, 2), opacity=0.62))
    return [field, charge], circles


def _compose_orb_tick(rng: _ComposeRng) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Sense / gather — orb field with vertical tick charge."""
    cx, cy = _optical_xy(rng)
    r = rng.randint(10, 12)
    sw_field = _field_stroke(rng)
    sw_charge = _charge_stroke(rng, sw_field)
    left = round(cx - r, 2)
    field = _path(
        f"M{left} {cy}a{r} {r} 0 1 1 {r * 2} 0a{r} {r} 0 1 1 -{r * 2} 0",
        stroke_width=sw_field,
        opacity=_FIELD_OPACITY,
    )
    tick_h = rng.randint(8, 11)
    charge = _path(
        f"M{cx} {cy - tick_h} L{cx} {cy + tick_h}",
        stroke_width=sw_charge,
        stroke_linecap="round",
        opacity=_CHARGE_OPACITY,
    )
    circles: list[dict[str, Any]] = []
    if rng.chance(_MARK_DOT_CHANCE):
        circles.append(_circle(cx, cy, round(1.0 + (rng._next() % 2) * 0.25, 2), opacity=0.62))
    return [field, charge], circles


def _compose_square_cross(rng: _ComposeRng) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Signal — rounded square field with plus charge."""
    cx, cy = _optical_xy(rng)
    half = rng.randint(8, 10)
    sw_field = _field_stroke(rng)
    sw_charge = _charge_stroke(rng, sw_field)
    field = _path(
        f"M{cx - half} {cy - half + 2} Q{cx - half} {cy - half} {cx - half + 2} {cy - half} "
        f"L{cx + half - 2} {cy - half} Q{cx + half} {cy - half} {cx + half} {cy - half + 2} "
        f"L{cx + half} {cy + half - 2} Q{cx + half} {cy + half} {cx + half - 2} {cy + half} "
        f"L{cx - half + 2} {cy + half} Q{cx - half} {cy + half} {cx - half} {cy + half - 2} Z",
        stroke_width=sw_field,
        opacity=_FIELD_OPACITY,
    )
    arm = rng.randint(6, 8)
    charge = _path(
        f"M{cx - arm} {cy} L{cx + arm} {cy} M{cx} {cy - arm} L{cx} {cy + arm}",
        stroke_width=sw_charge,
        stroke_linecap="round",
        opacity=_CHARGE_OPACITY,
    )
    return [field, charge], []


def _compose_disc_ray(rng: _ComposeRng) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Spark — ring field with short radial ray charge."""
    cx, cy = _optical_xy(rng)
    r = rng.randint(8, 10)
    sw_field = _field_stroke(rng)
    sw_charge = _charge_stroke(rng, sw_field)
    left = round(cx - r, 2)
    field = _path(
        f"M{left} {cy}a{r} {r} 0 1 1 {r * 2} 0a{r} {r} 0 1 1 -{r * 2} 0",
        stroke_width=sw_field,
        opacity=_FIELD_OPACITY,
    )
    ray_len = rng.randint(10, 13)
    angle_idx = rng._next() % 8
    rad = math.radians(angle_idx * 45 - 90)
    ex = round(cx + math.cos(rad) * ray_len, 2)
    ey = round(cy + math.sin(rad) * ray_len, 2)
    charge = _path(
        f"M{cx} {cy} L{ex} {ey}",
        stroke_width=sw_charge,
        stroke_linecap="round",
        opacity=_CHARGE_OPACITY,
    )
    return [field, charge], []


_COMPOSE_RENDERERS: dict[str, Callable[[_ComposeRng], tuple[list[dict[str, Any]], list[dict[str, Any]]]]] = {
    "compose_circle_star": _compose_circle_star,
    "compose_lozenge_bolt": _compose_lozenge_bolt,
    "compose_shield_chevron": _compose_shield_chevron,
    "compose_band_spire": _compose_band_spire,
    "compose_ring_flame": _compose_ring_flame,
    "compose_arc_crest": _compose_arc_crest,
    "compose_orb_tick": _compose_orb_tick,
    "compose_square_cross": _compose_square_cross,
    "compose_disc_ray": _compose_disc_ray,
}


def render_composition(
    family_id: str,
    rng: _ComposeRng,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    resolved = canonical_compose_family_id(family_id)
    renderer = _COMPOSE_RENDERERS.get(resolved)
    if renderer is None:
        renderer = _compose_lozenge_bolt
    for _ in range(4):
        paths, circles = renderer(rng)
        if is_valid_composition(paths, circles):
            return paths, circles
    return _compose_circle_star(rng)

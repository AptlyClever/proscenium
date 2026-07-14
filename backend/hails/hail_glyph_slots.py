"""H3.5 slot composer — field + charge rigblocks with parametric posture.

New Forge seeds pick ``slot_{field}_{charge}`` recipes instead of monolithic ``compose_*``
families. Field and charge share one optical anchor so the emblem reads as one character,
not two floating parts. Saved ``compose_*`` and ``hero_*`` ids still render via legacy paths.

See docs/hails/glyph-composition-direction-v001.md and Praxis H3 campaign guardrails.
"""

from __future__ import annotations

import math
from typing import Any, Final, Protocol

from hails.hail_glyph_composition import (
    _CHARGE_OPACITY,
    _CHARGE_SW_DELTA,
    _FIELD_OPACITY,
    _MARK_DOT_CHANCE,
    is_valid_composition,
)

SLOT_PREFIX: Final[str] = "slot_"

SLOT_FIELD_IDS: Final[tuple[str, ...]] = (
    "shield",
    "orb",
    "lozenge",
    "band",
    "crest",
)

SLOT_CHARGE_IDS: Final[tuple[str, ...]] = (
    "star",
    "bolt",
    "chevron",
    "spire",
    "flame",
    "wing",
    "ray",
    "diamond",
    "hook",
    "gem",
)

SLOT_POSTURES: Final[tuple[str, ...]] = ("centered", "chief", "dexter")

# How field and charge share the emblem — same recipe, different silhouette read.
SLOT_LAYOUTS: Final[tuple[str, ...]] = ("integrated", "charge_forward", "inscribed")

# Phase C-A — thin charges / crest arch need larger raw geometry to hit focal floor post-envelope.
_HERO_CHARGE_SPAN_BOOST: Final[dict[str, float]] = {
    "ray": 2.1,
    "wing": 1.45,
    "hook": 1.55,
    "bolt": 1.12,
    "spire": 1.1,
    "star": 1.15,
    "flame": 1.12,
    "diamond": 1.1,
    "gem": 1.1,
    "chevron": 1.08,
}
_SLOT_BIAS_WEIGHT: Final[int] = 3
_SLOT_DEFAULT_WEIGHT: Final[int] = 1
_OPTICAL_ANCHOR: Final[tuple[int, int]] = (24, 24)

# Curated pairs — no square-frame fields (avoid "+ in a box" read).
SLOT_RECIPE_IDS: Final[tuple[str, ...]] = tuple(
    f"{SLOT_PREFIX}{field}_{charge}" for field in SLOT_FIELD_IDS for charge in SLOT_CHARGE_IDS
)

_BUCKET_SLOT_BIAS: dict[str, frozenset[str]] = {
    "sense": frozenset(
        {
            "slot_orb_star",
            "slot_orb_hook",
            "slot_crest_gem",
            "slot_shield_chevron",
            "slot_orb_gem",
        }
    ),
    "motion": frozenset(
        {
            "slot_band_spire",
            "slot_lozenge_bolt",
            "slot_shield_bolt",
            "slot_band_ray",
            "slot_lozenge_ray",
        }
    ),
    "signal": frozenset(
        {
            "slot_shield_chevron",
            "slot_band_chevron",
            "slot_lozenge_spire",
            "slot_shield_gem",
        }
    ),
    "gather": frozenset(
        {
            "slot_orb_star",
            "slot_shield_gem",
            "slot_crest_diamond",
            "slot_orb_diamond",
        }
    ),
    "spark": frozenset(
        {
            "slot_orb_ray",
            "slot_lozenge_bolt",
            "slot_crest_flame",
            "slot_orb_flame",
            "slot_band_flame",
        }
    ),
    "neutral": frozenset(SLOT_RECIPE_IDS),
}


class _SlotRng(Protocol):
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


def _field_stroke(rng: _SlotRng, *, variation_only: bool) -> float:
    sw = rng.stroke_width(True)
    if variation_only:
        delta = (rng._next() % 5) * 0.1
        return round(max(2.0, min(3.4, sw + delta - 0.2)), 2)
    return sw


def _charge_stroke(rng: _SlotRng, field_sw: float) -> float:
    return max(rng.stroke_width(True), field_sw + _CHARGE_SW_DELTA)


def _int_range(rng: _SlotRng, lo: int, hi: int, *, variation_only: bool, widen: int = 2) -> int:
    if variation_only:
        lo = max(11, lo - widen)
        hi = min(37, hi + widen)
    return rng.randint(lo, hi)


def _anchor_xy(_rng: _SlotRng, _dx: int, _dy: int, *, variation_only: bool) -> tuple[int, int]:
    """Hero preview locks optical center — geometry varies around (24, 24), not under it."""
    return _OPTICAL_ANCHOR


def _posture_offset(_rng: _SlotRng, *, variation_only: bool) -> tuple[str, int, int]:
    """Posture jitter retired — Regenerate must not move the hero inside the preview box."""
    return "centered", 0, 0


def is_slot_recipe_id(value: str) -> bool:
    trimmed = (value or "").strip()
    return trimmed.startswith(SLOT_PREFIX) and trimmed in SLOT_RECIPE_IDS


def parse_slot_recipe_id(recipe_id: str) -> tuple[str, str] | None:
    trimmed = (recipe_id or "").strip()
    if not trimmed.startswith(SLOT_PREFIX):
        return None
    body = trimmed[len(SLOT_PREFIX) :]
    for field in SLOT_FIELD_IDS:
        prefix = f"{field}_"
        if body.startswith(prefix):
            charge = body[len(prefix) :]
            if charge in SLOT_CHARGE_IDS:
                return field, charge
    return None


def slot_recipe_id(field_id: str, charge_id: str) -> str:
    return f"{SLOT_PREFIX}{field_id}_{charge_id}"


def pick_weighted_slot(rng: _SlotRng, bucket: str, *, reset: bool = False) -> str:
    """Pick a slot recipe. Reset uses flat weights so silhouettes spread across the catalog."""
    if reset:
        return rng.pick_weighted(SLOT_RECIPE_IDS, tuple(1 for _ in SLOT_RECIPE_IDS))
    biased = _BUCKET_SLOT_BIAS.get(bucket, _BUCKET_SLOT_BIAS["neutral"])
    weights = tuple(
        _SLOT_BIAS_WEIGHT if rid in biased else _SLOT_DEFAULT_WEIGHT for rid in SLOT_RECIPE_IDS
    )
    return rng.pick_weighted(SLOT_RECIPE_IDS, weights)


def _pick_layout(rng: _SlotRng, field_id: str) -> str:
    if field_id == "band":
        options = ("integrated", "charge_forward")
    elif field_id == "crest":
        options = ("integrated", "charge_forward", "inscribed")
    else:
        options = SLOT_LAYOUTS
    return options[rng._next() % len(options)]


def _apply_layout(
    field: dict[str, Any],
    charge: dict[str, Any],
    layout: str,
) -> tuple[dict[str, Any], dict[str, Any]]:
    if layout == "integrated":
        return field, charge
    field_out = dict(field)
    charge_out = dict(charge)
    if layout == "charge_forward":
        field_out["opacity"] = round(float(field_out.get("opacity", _FIELD_OPACITY)) * 0.5, 2)
        field_out["stroke_width"] = round(max(1.5, float(field_out.get("stroke_width", 2.5)) * 0.78), 2)
        charge_out["stroke_width"] = round(float(charge_out.get("stroke_width", 2.8)) * 1.22, 2)
        charge_out["opacity"] = 1.0
    elif layout == "inscribed":
        field_out["opacity"] = round(min(0.44, float(field_out.get("opacity", _FIELD_OPACITY))), 2)
        charge_out["stroke_width"] = round(max(1.8, float(charge_out.get("stroke_width", 2.8)) * 0.78), 2)
    return field_out, charge_out


def _render_field(
    field_id: str,
    rng: _SlotRng,
    cx: int,
    cy: int,
    *,
    variation_only: bool,
) -> dict[str, Any]:
    sw = _field_stroke(rng, variation_only=variation_only)
    if field_id == "shield":
        top = _int_range(rng, 9, 11, variation_only=variation_only)
        bottom = _int_range(rng, 35, 37, variation_only=variation_only)
        half = _int_range(rng, 11, 13, variation_only=variation_only)
        return _path(
            f"M{cx - half} {top + 4} Q{cx} {top} {cx + half} {top + 4} L{cx + half - 1} {bottom - 4} "
            f"L{cx} {bottom} L{cx - half + 1} {bottom - 4} Z",
            stroke_width=sw,
            opacity=_FIELD_OPACITY,
        )
    if field_id == "orb":
        r = _int_range(rng, 11, 13, variation_only=variation_only)
        orb_pts: list[str] = []
        for i in range(8):
            ang = (math.pi / 4.0) * i - (math.pi / 2.0)
            ox = round(cx + r * math.cos(ang), 2)
            oy = round(cy + r * math.sin(ang), 2)
            orb_pts.append(f"{ox} {oy}")
        return _path(
            "M" + " L".join(orb_pts) + " Z",
            stroke_width=sw,
            opacity=_FIELD_OPACITY,
        )
    if field_id == "lozenge":
        hw = _int_range(rng, 11, 13, variation_only=variation_only)
        hh = _int_range(rng, 12, 14, variation_only=variation_only)
        return _path(
            f"M{cx} {cy - hh} L{cx + hw} {cy} L{cx} {cy + hh} L{cx - hw} {cy} Z",
            stroke_width=sw,
            opacity=_FIELD_OPACITY,
        )
    if field_id == "band":
        left = _int_range(rng, 9, 11, variation_only=variation_only, widen=1)
        right = _int_range(rng, 37, 39, variation_only=variation_only, widen=1)
        band_h = _int_range(rng, 7, 9, variation_only=variation_only)
        return _path(
            f"M{left} {cy - band_h} L{right} {cy - band_h} L{right} {cy + band_h} L{left} {cy + band_h} Z",
            stroke_width=sw,
            opacity=_FIELD_OPACITY,
            fill="none",
        )
    if field_id == "crest":
        base_y = cy + _int_range(rng, 5, 9, variation_only=variation_only)
        peak = cy - _int_range(rng, 11, 15, variation_only=variation_only)
        span = _int_range(rng, 16, 19, variation_only=variation_only)
        return _path(
            f"M{cx - span} {base_y} Q{cx} {peak} {cx + span} {base_y}",
            stroke_width=sw,
            opacity=_FIELD_OPACITY,
            stroke_linecap="round",
        )
    raise ValueError(f"unknown slot field: {field_id}")


def _charge_scale(rng: _SlotRng, *, variation_only: bool) -> float:
    if not variation_only:
        return 1.0
    pct = 85 + (rng._next() % 31)
    return pct / 100.0


def _render_charge(
    charge_id: str,
    rng: _SlotRng,
    cx: int,
    cy: int,
    field_sw: float,
    *,
    field_id: str,
    variation_only: bool,
    layout: str = "integrated",
) -> dict[str, Any]:
    sw = _charge_stroke(rng, field_sw)
    scale = _charge_scale(rng, variation_only=variation_only)
    scale *= _HERO_CHARGE_SPAN_BOOST.get(charge_id, 1.0)
    if layout == "inscribed":
        scale *= 0.72
    elif layout == "charge_forward":
        scale *= 1.08

    # Crest mounts charge at the arch peak; band keeps charge on the stripe midline.
    charge_cx, charge_cy = cx, cy
    if field_id == "crest":
        charge_cy = cy - _int_range(rng, 6, 10, variation_only=variation_only)
    elif field_id == "band":
        charge_cy = cy

    if charge_id == "star":
        r = max(4, round(_int_range(rng, 6, 8, variation_only=variation_only) * scale))
        variant = rng._next() % 2
        if variant == 0:
            return _path(
                f"M{charge_cx} {charge_cy - r} L{charge_cx + r} {charge_cy} "
                f"L{charge_cx} {charge_cy + r} L{charge_cx - r} {charge_cy} Z",
                stroke_width=sw,
                opacity=_CHARGE_OPACITY,
            )
        inner = max(2, r // 2)
        return _path(
            f"M{charge_cx} {charge_cy - r} L{charge_cx + inner} {charge_cy - inner} "
            f"L{charge_cx + r} {charge_cy} L{charge_cx + inner} {charge_cy + inner} "
            f"L{charge_cx} {charge_cy + r} L{charge_cx - inner} {charge_cy + inner} "
            f"L{charge_cx - r} {charge_cy} L{charge_cx - inner} {charge_cy - inner} Z",
            stroke_width=sw,
            opacity=_CHARGE_OPACITY,
        )
    if charge_id == "bolt":
        j = max(2, round(_int_range(rng, 3, 5, variation_only=variation_only) * scale))
        hh = max(6, round(_int_range(rng, 8, 11, variation_only=variation_only) * scale))
        flip = -1 if rng._next() % 2 else 1
        return _path(
            f"M{charge_cx} {charge_cy - hh} L{charge_cx + flip * j} {charge_cy - 1} "
            f"L{charge_cx - flip} {charge_cy + 1} L{charge_cx + flip * (j - 1)} {charge_cy + hh}",
            stroke_width=sw,
            stroke_linejoin="round",
            opacity=_CHARGE_OPACITY,
        )
    if charge_id == "chevron":
        w = max(4, round(_int_range(rng, 6, 9, variation_only=variation_only) * scale))
        direction = -1 if rng._next() % 2 else 1
        return _path(
            f"M{charge_cx - w} {charge_cy + direction} L{charge_cx} {charge_cy - direction * w} "
            f"L{charge_cx + w} {charge_cy + direction}",
            stroke_width=sw,
            opacity=_CHARGE_OPACITY,
        )
    if charge_id == "spire":
        half_w = max(4, round(_int_range(rng, 5, 8, variation_only=variation_only) * scale))
        top = charge_cy - _int_range(rng, 10, 14, variation_only=variation_only)
        return _path(
            f"M{charge_cx - half_w} {charge_cy} Q{charge_cx} {top} {charge_cx + half_w} {charge_cy}",
            stroke_width=sw,
            stroke_linecap="round",
            opacity=_CHARGE_OPACITY,
        )
    if charge_id == "flame":
        rise = max(7, round(_int_range(rng, 9, 13, variation_only=variation_only) * scale))
        spread = max(3, round(_int_range(rng, 4, 7, variation_only=variation_only) * scale))
        return _path(
            f"M{charge_cx} {charge_cy + 2} Q{charge_cx - spread} {charge_cy - rise // 2} {charge_cx} {charge_cy - rise} "
            f"Q{charge_cx + spread} {charge_cy - rise // 2} {charge_cx} {charge_cy + 2}",
            stroke_width=sw,
            stroke_linecap="round",
            opacity=_CHARGE_OPACITY,
        )
    if charge_id == "wing":
        span = max(6, round(_int_range(rng, 8, 12, variation_only=variation_only) * scale))
        lift = max(3, round(_int_range(rng, 4, 7, variation_only=variation_only) * scale))
        mirror = -1 if rng._next() % 2 else 1
        return _path(
            f"M{charge_cx - mirror * span} {charge_cy + 2} "
            f"Q{charge_cx - mirror * span // 3} {charge_cy - lift} "
            f"{charge_cx + mirror * span // 2} {charge_cy - 1}",
            stroke_width=sw,
            stroke_linecap="round",
            opacity=_CHARGE_OPACITY,
        )
    if charge_id == "ray":
        ray_len = max(16, round(_int_range(rng, 18, 22, variation_only=variation_only) * scale))
        angle_idx = rng._next() % 8
        rad = math.radians(angle_idx * 45 - 90)
        ex = round(charge_cx + math.cos(rad) * ray_len, 2)
        ey = round(charge_cy + math.sin(rad) * ray_len, 2)
        return _path(
            f"M{charge_cx} {charge_cy} L{ex} {ey}",
            stroke_width=sw,
            stroke_linecap="round",
            opacity=_CHARGE_OPACITY,
        )
    if charge_id == "diamond":
        half = max(4, round(_int_range(rng, 5, 8, variation_only=variation_only) * scale))
        tall = max(half + 1, round(half * 1.25))
        return _path(
            f"M{charge_cx} {charge_cy - tall} L{charge_cx + half} {charge_cy} "
            f"L{charge_cx} {charge_cy + tall} L{charge_cx - half} {charge_cy} Z",
            stroke_width=sw,
            opacity=_CHARGE_OPACITY,
        )
    if charge_id == "hook":
        r = max(4, round(_int_range(rng, 5, 8, variation_only=variation_only) * scale))
        mirror = -1 if rng._next() % 2 else 1
        return _path(
            f"M{charge_cx + mirror * r} {charge_cy - r} A{r} {r} 0 1 0 {charge_cx - mirror * r} {charge_cy + r}",
            stroke_width=sw,
            stroke_linecap="round",
            opacity=_CHARGE_OPACITY,
        )
    # gem — faceted kite (taller than diamond)
    half = max(4, round(_int_range(rng, 5, 7, variation_only=variation_only) * scale))
    return _path(
        f"M{charge_cx} {charge_cy - half - 2} L{charge_cx + half + 1} {charge_cy} "
        f"L{charge_cx} {charge_cy + half + 2} L{charge_cx - half - 1} {charge_cy} Z",
        stroke_width=sw,
        opacity=_CHARGE_OPACITY,
    )


def _render_mark_notch(rng: _SlotRng, cx: int, cy: int, field_sw: float) -> dict[str, Any]:
    sw = max(1.8, field_sw * 0.85)
    tick = rng.randint(3, 5)
    side = rng._next() % 4
    if side == 0:
        d = f"M{cx - tick} {cy - 10} L{cx + tick} {cy - 10}"
    elif side == 1:
        d = f"M{cx + 10} {cy - tick} L{cx + 10} {cy + tick}"
    elif side == 2:
        d = f"M{cx - tick} {cy + 10} L{cx + tick} {cy + 10}"
    else:
        d = f"M{cx - 10} {cy - tick} L{cx - 10} {cy + tick}"
    return _path(d, stroke_width=sw, stroke_linecap="round", opacity=_CHARGE_OPACITY * 0.85)


def _compose_slot_paths(
    field_id: str,
    charge_id: str,
    rng: _SlotRng,
    *,
    variation_only: bool,
) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    layout = _pick_layout(rng, field_id)
    posture, dx, dy = _posture_offset(rng, variation_only=variation_only)
    cx, cy = _anchor_xy(rng, dx, dy, variation_only=variation_only)
    field = _render_field(field_id, rng, cx, cy, variation_only=variation_only)
    field_sw = float(field.get("stroke_width", 2.5))
    charge = _render_charge(
        charge_id,
        rng,
        cx,
        cy,
        field_sw,
        field_id=field_id,
        variation_only=variation_only,
        layout=layout,
    )
    field, charge = _apply_layout(field, charge, layout)
    paths = [field, charge]
    mark_id = None
    if rng.chance(_MARK_DOT_CHANCE // 2 if variation_only else _MARK_DOT_CHANCE) and len(paths) < 3:
        paths.append(_render_mark_notch(rng, cx, cy, field_sw))
        mark_id = "notch"
    composition: dict[str, Any] = {
        "schema": "slot_v1",
        "field_id": field_id,
        "charge_id": charge_id,
        "posture": posture,
        "layout_id": layout,
        "mark_id": mark_id,
        "anchor": {"cx": cx, "cy": cy},
    }
    return paths, composition


def render_slot_recipe(
    recipe_id: str,
    rng: _SlotRng,
    *,
    variation_only: bool = False,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]], dict[str, Any]]:
    """Render integrated field + charge; optional mark as third path (TV-safe)."""
    parsed = parse_slot_recipe_id(recipe_id)
    if parsed is None:
        recipe_id = pick_weighted_slot(rng, "neutral")
        parsed = parse_slot_recipe_id(recipe_id)
    assert parsed is not None
    field_id, charge_id = parsed

    circles: list[dict[str, Any]] = []
    for _ in range(4):
        paths, composition = _compose_slot_paths(
            field_id,
            charge_id,
            rng,
            variation_only=variation_only,
        )
        if is_valid_composition(paths, circles):
            return paths, circles, composition

    paths, composition = _compose_slot_paths(
        field_id,
        charge_id,
        rng,
        variation_only=variation_only,
    )
    return paths, circles, composition

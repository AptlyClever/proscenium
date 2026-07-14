"""Procedural custom glyph generation — Kind-routed Glyph Hero style v1 (proto).

Default Forge Reset uses Places / People / Characters (`hail_glyph_kind.py`).
H3.5 `slot_*` remains grammar-lab (saved glyphs + explicit family_id). Legacy compose_* /
H2 hero templates remain for older saved glyph_family_id values.

Axiom preview + Google TV via glyph_render. See doctrine-hail-glyph-hero-style.
"""

from __future__ import annotations

import hashlib
import re
from typing import Any, Final

from hails.hail_glyph_path_roles import apply_canonical_depth_pass
from hails.hail_glyph_envelope import (
    apply_procedural_graph_instance_jitter,
    uplift_procedural_graph_hero_focal_mass,
    normalize_procedural_graph_envelope,
)
from hails.hail_glyph_character import (
    CHARACTER_RECIPE_IDS,
    is_character_recipe_id,
    render_character_recipe,
)
from hails.hail_glyph_kind import pick_family_for_kind, resolve_glyph_kind
from hails.hail_glyph_people import (
    PERSON_RECIPE_IDS,
    is_person_recipe_id,
    render_person_recipe,
)
from hails.hail_glyph_places import (
    PLACE_RECIPE_IDS,
    is_place_recipe_id,
    render_place_recipe,
)
from hails.hail_glyph_icons import (
    ICON_RECIPE_IDS,
    is_icon_recipe_id,
    pick_icon_recipe_id,
    render_icon_recipe,
)
from hails.hail_glyph_composition import (
    COMPOSE_FAMILY_IDS,
    canonical_compose_family_id,
    is_compose_family_id,
    is_valid_composition,
    pick_weighted_compose,
    render_composition,
)
from hails.hail_glyph_hero_templates import (
    DEPRECATED_HERO_ALIASES,
    HERO_TEMPLATE_IDS,
    canonical_hero_family_id,
    is_hero_template_id,
    render_hero_template,
)
from hails.hail_glyph_slots import (
    SLOT_RECIPE_IDS,
    is_slot_recipe_id,
    pick_weighted_slot,
    render_slot_recipe,
)

# Legacy catalog — kept for glyphs saved before parametric graphs.
PROCEDURAL_MOTIF_IDS: Final[tuple[str, ...]] = (
    "arc-mark",
    "beam-rise",
    "orbit-sweep",
    "stack-pulse",
    "diamond-node",
    "wave-forward",
    "signal-post",
    "balance-cross",
)

PROCEDURAL_GRAPH_VERSION: Final[int] = 1

_BUCKET_KEYWORDS: dict[str, tuple[str, ...]] = {
    "sense": (
        "see",
        "look",
        "eye",
        "sniff",
        "scent",
        "smell",
        "watch",
        "notice",
        "view",
        "peek",
        "hear",
        "listen",
        "seed",
        "sniffing",
    ),
    "motion": (
        "go",
        "move",
        "travel",
        "send",
        "route",
        "run",
        "fly",
        "shift",
        "port",
        "transport",
        "come",
        "leave",
        "transporter",
    ),
    "signal": (
        "alert",
        "warn",
        "help",
        "urgent",
        "ping",
        "call",
        "summon",
        "hey",
        "up",
        "wait",
        "stop",
        "blech",
    ),
    "gather": ("home", "room", "bed", "arcade", "here", "gather", "meet", "bedroom"),
    "spark": ("play", "fun", "party", "game", "cool", "nice", "spark", "joy"),
}

_BUCKET_BIAS: dict[str, tuple[str, ...]] = {
    "sense": ("arc_eye", "orbit_ticks", "ring_accent", "hook_pair", "pulse_ring", "lookout"),
    "motion": ("chevron", "wave_pair", "slash_forward", "zig_rise", "beam_crown", "flow_stem"),
    "signal": ("stem_bars", "cross_bars", "stack_lines", "pulse_ring", "hook_pair"),
    "gather": ("diamond_core", "ring_accent", "open_corner", "orbit_ticks", "stack_lines"),
    "spark": ("chevron", "beam_crown", "zig_rise", "slash_forward", "arc_eye"),
    "neutral": (
        "diamond_core",
        "cross_bars",
        "wave_pair",
        "stack_lines",
        "ring_accent",
        "chevron",
        "hook_pair",
        "open_corner",
    ),
}

# Atomic primitives for on-the-spot composition (not a fixed motif catalog).
_PRIMITIVE_KINDS: Final[tuple[str, ...]] = (
    "line",
    "arc",
    "quad",
    "cubic",
    "hline",
    "vline",
    "corner",
    "dot",
)

_BUCKET_NAMES: Final[tuple[str, ...]] = tuple(_BUCKET_KEYWORDS.keys()) + ("neutral",)

_GENERIC_GLYPH_NAMES: Final[frozenset[str]] = frozenset({"", "glyph", "new glyph", "custom glyph"})

_TOKEN_RE = re.compile(r"[a-z0-9]+")


def _normalize_seed(seed: int) -> int:
    """Map any integer seed into unsigned 32-bit space for stable RNG material."""
    return seed & 0xFFFFFFFF


def _parse_graph_version(raw: Any) -> int | None:
    if raw is None:
        return 0
    if isinstance(raw, bool):
        return None
    if isinstance(raw, int):
        return raw
    if isinstance(raw, float) and raw.is_integer():
        return int(raw)
    if isinstance(raw, str):
        stripped = raw.strip()
        if not stripped:
            return 0
        try:
            return int(stripped, 10)
        except ValueError:
            return None
    return None


class _GlyphRng:
    """Deterministic byte stream for parametric coordinates."""

    def __init__(self, digest: bytes, seed: int | None = None) -> None:
        material = digest + (
            _normalize_seed(seed).to_bytes(4, "big", signed=False) if seed is not None else b""
        )
        self._stream = hashlib.sha256(material).digest()
        self._cursor = 0

    def _next(self) -> int:
        value = self._stream[self._cursor % len(self._stream)]
        self._cursor += 1
        return value

    def randint(self, lo: int, hi: int) -> int:
        if hi <= lo:
            return lo
        span = hi - lo + 1
        return lo + (self._next() % span)

    def chance(self, pct: int) -> bool:
        return self._next() < max(1, (255 * pct) // 100)

    def pick(self, items: tuple[str, ...]) -> str:
        return items[self._next() % len(items)]

    def pick_weighted(self, items: tuple[str, ...], weights: tuple[int, ...]) -> str:
        total = sum(weights)
        roll = self._next() % total
        acc = 0
        for item, weight in zip(items, weights):
            acc += weight
            if roll < acc:
                return item
        return items[-1]

    def coord(self, lo: int = 11, hi: int = 37) -> int:
        return self.randint(lo, hi)

    def stroke_width(self, primary: bool = True) -> float:
        if primary:
            return round(2.0 + (self._next() % 8) * 0.1, 1)
        return round(1.75 + (self._next() % 6) * 0.1, 1)


def _tokenize(text: str) -> list[str]:
    return _TOKEN_RE.findall(text.lower())


def _keyword_hit(token: str, keyword: str) -> bool:
    return token == keyword or token.startswith(keyword) or keyword in token


def _is_generic_glyph_name(glyph_name: str) -> bool:
    return _tokenize(glyph_name.strip()) == [] or glyph_name.strip().lower() in _GENERIC_GLYPH_NAMES


def _score_buckets(text: str) -> dict[str, int]:
    tokens = _tokenize(text)
    scores = {bucket: 0 for bucket in _BUCKET_NAMES}
    for token in tokens:
        for bucket, keywords in _BUCKET_KEYWORDS.items():
            if any(_keyword_hit(token, keyword) for keyword in keywords):
                scores[bucket] += 1
    return scores


def _bucket_from_scores(scores: dict[str, int], digest: bytes) -> str:
    best = max(scores.values())
    if best == 0:
        return "neutral"
    leaders = [bucket for bucket, score in scores.items() if score == best]
    return leaders[digest[8] % len(leaders)]


def resolve_semantic_bucket(glyph_name: str, hail_name: str, digest: bytes) -> str:
    """Glyph name drives semantics once the operator names the mark; hail name fills generic placeholders."""
    glyph = glyph_name.strip()
    hail = hail_name.strip()
    if _is_generic_glyph_name(glyph):
        return _bucket_from_scores(_score_buckets(hail or glyph), digest)
    glyph_scores = _score_buckets(glyph)
    if max(glyph_scores.values()) > 0:
        return _bucket_from_scores(glyph_scores, digest)
    if hail:
        return _bucket_from_scores(_score_buckets(hail), digest)
    return "neutral"


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


def _emit_primitive(
    kind: str,
    rng: _GlyphRng,
    *,
    primary: bool = True,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    sw = rng.stroke_width(primary)
    opacity = 1.0 if primary else round(0.55 + (rng._next() % 4) * 0.08, 2)
    stroke = "currentColor" if primary else ("var(--ca-status-info-fg)" if rng.chance(40) else "currentColor")

    if kind == "line":
        x1, y1, x2, y2 = rng.coord(), rng.coord(), rng.coord(), rng.coord()
        return [_path(f"M{x1} {y1} L{x2} {y2}", stroke=stroke, stroke_width=sw, opacity=opacity)], []

    if kind == "hline":
        y = rng.coord()
        x = rng.coord(10, 18)
        width = rng.randint(14, 24)
        return [_path(f"M{x} {y}h{width}", stroke=stroke, stroke_width=sw, opacity=opacity)], []

    if kind == "vline":
        x = rng.coord()
        y = rng.coord(12, 18)
        height = rng.randint(14, 22)
        return [_path(f"M{x} {y}v{height}", stroke=stroke, stroke_width=sw, opacity=opacity)], []

    if kind == "arc":
        cx = rng.coord(16, 32)
        cy = rng.coord(16, 32)
        rx = rng.randint(6, 14)
        ry = rng.randint(5, 11)
        sweep = rng.randint(0, 1)
        large = rng.randint(0, 1)
        x0 = cx - rx
        return [
            _path(
                f"M{x0} {cy}a{rx} {ry} 0 {large} {sweep} {rx * 2} 0",
                stroke=stroke,
                stroke_width=sw,
                opacity=opacity,
            )
        ], []

    if kind == "quad":
        x0, y0 = rng.coord(), rng.coord()
        qx, qy = rng.coord(), rng.coord()
        x1, y1 = rng.coord(), rng.coord()
        return [_path(f"M{x0} {y0} Q{qx} {qy} {x1} {y1}", stroke=stroke, stroke_width=sw, opacity=opacity)], []

    if kind == "cubic":
        x0, y0 = rng.coord(), rng.coord()
        c1x, c1y = rng.coord(), rng.coord()
        c2x, c2y = rng.coord(), rng.coord()
        x1, y1 = rng.coord(), rng.coord()
        return [
            _path(
                f"M{x0} {y0} C{c1x} {c1y} {c2x} {c2y} {x1} {y1}",
                stroke=stroke,
                stroke_width=sw,
                opacity=opacity,
            )
        ], []

    if kind == "corner":
        x = rng.coord(12, 18)
        y = rng.coord(12, 18)
        w = rng.randint(10, 18)
        h = rng.randint(10, 18)
        flip = rng.chance(50)
        if flip:
            return [_path(f"M{x} {y + h} L{x} {y} L{x + w} {y}", stroke=stroke, stroke_width=sw, opacity=opacity, stroke_linejoin="round")], []
        return [_path(f"M{x} {y} L{x + w} {y} L{x + w} {y + h}", stroke=stroke, stroke_width=sw, opacity=opacity, stroke_linejoin="round")], []

    # dot
    cx, cy = rng.coord(), rng.coord()
    r = round(1.6 + (rng._next() % 6) * 0.35, 2)
    return [], [_circle(cx, cy, r, opacity=opacity if primary else min(opacity, 0.75))]


def _compose_from_primitives(
    rng: _GlyphRng,
    *,
    max_pieces: int = 2,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    paths: list[dict[str, Any]] = []
    circles: list[dict[str, Any]] = []
    pieces = rng.randint(1, max(1, max_pieces))
    for idx in range(pieces):
        kind = rng.pick(_PRIMITIVE_KINDS)
        p, c = _emit_primitive(kind, rng, primary=idx == 0)
        paths.extend(p)
        circles.extend(c)
        if len(paths) >= 3:
            break
    if not paths:
        p, c = _emit_primitive(rng.pick(("line", "arc", "hline", "vline", "quad", "cubic", "corner")), rng, primary=True)
        paths.extend(p)
        circles.extend(c)
    return paths[:3], circles[:2]


def _gen_arc_eye(rng: _GlyphRng) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    cx = rng.randint(21, 27)
    cy = rng.randint(19, 25)
    span = rng.randint(9, 14)
    left = cx - span
    base_y = cy + rng.randint(3, 7)
    lift = rng.randint(5, 9)
    sw = rng.stroke_width()
    paths = [_path(f"M{left} {base_y}c{span // 2}-{lift} {span + span // 2}-{lift} {span * 2} 0", stroke_width=sw)]
    circles: list[dict[str, Any]] = []
    if rng.chance(82):
        circles.append(_circle(cx, cy - rng.randint(0, 2), round(2.0 + (rng._next() % 4) * 0.35, 2)))
    return paths, circles


def _gen_orbit_ticks(rng: _GlyphRng) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    y = rng.coord(22, 30)
    rx = rng.randint(12, 16)
    ry = rng.randint(6, 10)
    left = 24 - rx
    sw = rng.stroke_width()
    paths = [_path(f"M{left} {y}a{rx} {ry} 0 0 1 {rx * 2} 0", stroke_width=sw)]
    if rng.chance(70):
        tick_x = left + rx * 2 - rng.randint(1, 4)
        paths.append(
            _path(
                f"M{tick_x} {y - 2} L{tick_x + 4} {y - 6} M{tick_x} {y + 2} L{tick_x + 4} {y + 6}",
                stroke="var(--ca-status-info-fg)",
                stroke_width=rng.stroke_width(False),
            )
        )
    return paths, []


def _gen_chevron(rng: _GlyphRng) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    peak_y = rng.coord(13, 20)
    base_y = rng.coord(28, 34)
    half = rng.randint(7, 11)
    cx = rng.randint(22, 26)
    sw = rng.stroke_width()
    paths = [
        _path(
            f"M{cx - half} {base_y} L{cx} {peak_y} L{cx + half} {base_y}",
            stroke_width=sw,
            stroke_linejoin="round",
        )
    ]
    if rng.chance(55):
        wing = rng.randint(4, 7)
        paths.append(
            _path(
                f"M{cx - half - wing} {base_y - rng.randint(4, 7)} L{cx - half} {base_y - rng.randint(1, 3)} "
                f"M{cx + half} {base_y - rng.randint(1, 3)} L{cx + half + wing} {base_y - rng.randint(4, 7)}",
                stroke_width=rng.stroke_width(False),
                opacity=0.65,
            )
        )
    return paths, []


def _gen_wave_pair(rng: _GlyphRng) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    y1 = rng.coord(20, 26)
    y2 = y1 + rng.randint(5, 8)
    amp = rng.randint(3, 5)
    left = rng.coord(10, 14)
    width = rng.randint(20, 24)
    mid = left + width // 2
    right = left + width
    sw = rng.stroke_width()
    paths = [
        _path(
            f"M{left} {y1}c{amp}-{amp} {width // 2 - amp}-{amp} {width // 2} 0s{width // 2 - amp} {amp} {width // 2} 0",
            stroke_width=sw,
        ),
        _path(
            f"M{left} {y2}c{amp}-{amp} {width // 2 - amp}-{amp} {width // 2} 0s{width // 2 - amp} {amp} {width // 2} 0",
            stroke_width=rng.stroke_width(False),
            opacity=0.72,
        ),
    ]
    return paths, []


def _gen_stem_bars(rng: _GlyphRng) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    cx = rng.randint(22, 26)
    top = rng.coord(12, 16)
    bottom = rng.coord(30, 35)
    sw = rng.stroke_width()
    paths = [_path(f"M{cx} {top}v{bottom - top}", stroke_width=sw + 0.25)]
    bars = rng.randint(1, 2)
    for i in range(bars):
        y = top + rng.randint(5, 9) + i * rng.randint(5, 7)
        half = rng.randint(7, 10) - i
        paths.append(
            _path(
                f"M{cx - half} {y}h{half * 2}",
                stroke="var(--ca-status-info-fg)" if i else "currentColor",
                stroke_width=rng.stroke_width(False),
            )
        )
    return paths, []


def _gen_diamond_core(rng: _GlyphRng) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    cx = rng.randint(22, 26)
    cy = rng.randint(22, 26)
    reach = rng.randint(9, 12)
    sw = rng.stroke_width()
    paths = [
        _path(
            f"M{cx} {cy - reach} L{cx + reach} {cy} L{cx} {cy + reach} L{cx - reach} {cy} Z",
            stroke_width=sw,
            stroke_linejoin="round",
        )
    ]
    circles = [_circle(cx, cy, round(1.8 + (rng._next() % 5) * 0.3, 2))]
    return paths, circles


def _gen_cross_bars(rng: _GlyphRng) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    cx = rng.randint(22, 26)
    cy = rng.randint(22, 26)
    reach = rng.randint(7, 10)
    sw = rng.stroke_width()
    paths = [_path(f"M{cx} {cy - reach}v{reach * 2}M{cx - reach} {cy}h{reach * 2}", stroke_width=sw + 0.25)]
    if rng.chance(75):
        arm = rng.randint(4, 7)
        paths.append(
            _path(
                f"M{cx - reach} {cy - arm}h{arm}M{cx + reach - arm} {cy + arm}h{arm}",
                stroke_width=rng.stroke_width(False),
                opacity=0.55,
            )
        )
    return paths, []


def _gen_stack_lines(rng: _GlyphRng) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    top = rng.coord(14, 18)
    gap = rng.randint(6, 8)
    left = rng.coord(12, 16)
    width = rng.randint(20, 24)
    lines = rng.randint(2, 3)
    sw = rng.stroke_width()
    paths = []
    for i in range(lines):
        inset = i * rng.randint(1, 2)
        paths.append(_path(f"M{left + inset} {top + i * gap}h{width - inset * 2}", stroke_width=sw - i * 0.15))
    return paths, []


def _gen_slash_forward(rng: _GlyphRng) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    x1 = rng.coord(12, 16)
    y1 = rng.coord(28, 34)
    x2 = x1 + rng.randint(10, 14)
    y2 = y1 - rng.randint(12, 18)
    sw = rng.stroke_width()
    paths = [_path(f"M{x1} {y1} L{x2} {y2}", stroke_width=sw)]
    if rng.chance(68):
        offset = rng.randint(6, 10)
        paths.append(
            _path(
                f"M{x1 + offset} {y1} L{x2 + offset} {y2}",
                stroke_width=rng.stroke_width(False),
                opacity=0.62,
            )
        )
    return paths, []


def _gen_ring_accent(rng: _GlyphRng) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    cx = rng.randint(22, 26)
    cy = rng.randint(21, 27)
    r = rng.randint(8, 11)
    sw = rng.stroke_width()
    paths = [_path(f"M{cx - r} {cy}a{r} {r} 0 1 1 {r * 2} 0a{r} {r} 0 1 1 -{r * 2} 0", stroke_width=sw)]
    circles = []
    if rng.chance(60):
        circles.append(_circle(cx, cy, round(1.6 + (rng._next() % 4) * 0.35, 2)))
    return paths, circles


def _gen_hook_pair(rng: _GlyphRng) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    cy = rng.coord(20, 26)
    span = rng.randint(8, 12)
    lift = rng.randint(5, 8)
    left = rng.coord(12, 16)
    right = left + span * 2
    sw = rng.stroke_width()
    paths = [
        _path(f"M{left} {cy + lift}c{span // 2}-{lift} {span}-{lift // 2} {span} 0"),
        _path(f"M{right} {cy + lift}c-{span // 2}-{lift} -{span}-{lift // 2} -{span} 0", opacity=0.78),
    ]
    return paths, []


def _gen_beam_crown(rng: _GlyphRng) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    cx = rng.randint(22, 26)
    base = rng.coord(28, 33)
    peak = rng.coord(12, 17)
    half = rng.randint(6, 9)
    sw = rng.stroke_width()
    paths = [_path(f"M{cx - half} {base} L{cx} {peak} L{cx + half} {base}", stroke_width=sw, stroke_linejoin="round")]
    if rng.chance(65):
        spread = rng.randint(5, 8)
        paths.append(
            _path(
                f"M{cx - half - spread} {base - rng.randint(2, 5)} L{cx - half} {peak + rng.randint(3, 6)} "
                f"M{cx + half} {peak + rng.randint(3, 6)} L{cx + half + spread} {base - rng.randint(2, 5)}",
                stroke_width=rng.stroke_width(False),
                opacity=0.6,
            )
        )
    return paths, []


def _gen_pulse_ring(rng: _GlyphRng) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    cx = rng.randint(22, 26)
    cy = rng.randint(21, 27)
    r1 = rng.randint(4, 6)
    r2 = r1 + rng.randint(4, 6)
    sw = rng.stroke_width()
    paths = [
        _path(f"M{cx - r1} {cy}a{r1} {r1} 0 1 1 {r1 * 2} 0", stroke_width=sw),
        _path(f"M{cx - r2} {cy}a{r2} {r2} 0 1 1 {r2 * 2} 0", stroke_width=rng.stroke_width(False), opacity=0.55),
    ]
    return paths, []


def _gen_zig_rise(rng: _GlyphRng) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    x = rng.coord(14, 18)
    y = rng.coord(28, 33)
    step_x = rng.randint(5, 8)
    step_y = rng.randint(5, 8)
    segments = rng.randint(2, 3)
    parts = [f"M{x} {y}"]
    cx, cy = x, y
    for i in range(segments):
        cx += step_x
        cy -= step_y + rng.randint(-1, 1)
        parts.append(f"L{cx} {cy}")
    sw = rng.stroke_width()
    return [_path(" ".join(parts), stroke_width=sw, stroke_linejoin="round")], []


def _gen_flow_stem(rng: _GlyphRng) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    x = rng.coord(14, 18)
    y0 = rng.coord(28, 34)
    sw = rng.stroke_width()
    paths = [_path(f"M{x} {y0} L{x + rng.randint(14, 20)} {y0 - rng.randint(14, 20)}", stroke_width=sw)]
    if rng.chance(70):
        paths.append(
            _path(
                f"M{x + rng.randint(4, 8)} {y0 - rng.randint(2, 5)} "
                f"Q{x + rng.randint(12, 18)} {y0 - rng.randint(8, 12)} "
                f"{x + rng.randint(18, 24)} {y0 - rng.randint(12, 18)}",
                stroke_width=rng.stroke_width(False),
                opacity=0.68,
            )
        )
    return paths, []


def _gen_open_corner(rng: _GlyphRng) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    x = rng.coord(13, 18)
    y = rng.coord(14, 18)
    w = rng.randint(14, 18)
    h = rng.randint(14, 18)
    sw = rng.stroke_width()
    paths = [_path(f"M{x} {y + h} L{x} {y} L{x + w} {y}", stroke_width=sw, stroke_linejoin="round")]
    if rng.chance(55):
        ox = x + w - rng.randint(3, 6)
        oy = y + rng.randint(3, 6)
        paths.append(_path(f"M{ox} {oy} L{x + w} {y}", stroke_width=rng.stroke_width(False), opacity=0.65))
    return paths, []


def _gen_lookout(rng: _GlyphRng) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    cx = rng.randint(22, 26)
    w = rng.randint(14, 18)
    left = cx - w // 2
    right = cx + w // 2
    mid_y = rng.coord(22, 26)
    lid_y = mid_y - rng.randint(6, 9)
    sw = rng.stroke_width()
    paths = [_path(f"M{left} {mid_y} Q{cx} {lid_y} {right} {mid_y}", stroke_width=sw)]
    circles = [_circle(cx, mid_y + rng.randint(1, 3), round(2.0 + (rng._next() % 3) * 0.4, 2))]
    return paths, circles


_GENERATORS: dict[str, Any] = {
    "arc_eye": _gen_arc_eye,
    "orbit_ticks": _gen_orbit_ticks,
    "chevron": _gen_chevron,
    "wave_pair": _gen_wave_pair,
    "stem_bars": _gen_stem_bars,
    "diamond_core": _gen_diamond_core,
    "cross_bars": _gen_cross_bars,
    "stack_lines": _gen_stack_lines,
    "slash_forward": _gen_slash_forward,
    "ring_accent": _gen_ring_accent,
    "hook_pair": _gen_hook_pair,
    "beam_crown": _gen_beam_crown,
    "pulse_ring": _gen_pulse_ring,
    "zig_rise": _gen_zig_rise,
    "flow_stem": _gen_flow_stem,
    "open_corner": _gen_open_corner,
    "lookout": _gen_lookout,
}

_ALL_GENERATOR_IDS: Final[tuple[str, ...]] = tuple(_GENERATORS.keys())
_BIAS_WEIGHT: Final[int] = 3
_DEFAULT_WEIGHT: Final[int] = 1


def _pick_weighted_generator(rng: _GlyphRng, bucket: str) -> str:
    """Any recipe may run; semantic bucket is a soft bias, not a hard filter."""
    biased = set(_BUCKET_BIAS.get(bucket, _BUCKET_BIAS["neutral"]))
    weights = tuple(_BIAS_WEIGHT if gid in biased else _DEFAULT_WEIGHT for gid in _ALL_GENERATOR_IDS)
    return rng.pick_weighted(_ALL_GENERATOR_IDS, weights)


def _pick_initial_family(
    rng: _GlyphRng,
    bucket: str,
    *,
    glyph_name: str = "",
    hail_name: str = "",
    remix: bool = False,
) -> str:
    """Kind-routed family for Reset / re-encode (proto Glyph Hero style v1)."""
    kind = resolve_glyph_kind(
        rng,
        bucket,
        glyph_name=glyph_name,
        hail_name=hail_name,
        remix=remix,
    )
    return pick_family_for_kind(
        kind,
        rng,
        bucket,
        glyph_name=glyph_name,
        hail_name=hail_name,
        remix=remix,
    )


def _canonical_family_id(family_id: str) -> str:
    if is_slot_recipe_id(family_id):
        return family_id.strip()
    if is_compose_family_id(family_id):
        return canonical_compose_family_id(family_id)
    if is_hero_template_id(family_id):
        return canonical_hero_family_id(family_id)
    return family_id


def _is_kind_family(family_id: str) -> bool:
    return (
        is_character_recipe_id(family_id)
        or is_place_recipe_id(family_id)
        or is_person_recipe_id(family_id)
    )


def _render_family(
    family_id: str,
    rng: _GlyphRng,
    *,
    variation_only: bool,
    remix: bool = False,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]], dict[str, Any] | None]:
    jitter = variation_only or remix or _is_kind_family(family_id)
    if is_slot_recipe_id(family_id):
        paths, circles, _composition = render_slot_recipe(
            family_id,
            rng,
            variation_only=jitter,
        )
        return paths, circles, _composition
    if is_icon_recipe_id(family_id):
        paths, circles, composition = render_icon_recipe(
            family_id,
            rng,
            variation_only=variation_only,
            remix=remix,
        )
        return paths, circles, composition
    if is_character_recipe_id(family_id):
        paths, circles, composition = render_character_recipe(
            family_id,
            rng,
            variation_only=jitter,
        )
        return paths, circles, composition
    if is_place_recipe_id(family_id):
        paths, circles, composition = render_place_recipe(
            family_id,
            rng,
            variation_only=jitter,
        )
        return paths, circles, composition
    if is_person_recipe_id(family_id):
        paths, circles, composition = render_person_recipe(
            family_id,
            rng,
            variation_only=jitter,
        )
        return paths, circles, composition
    if is_compose_family_id(family_id):
        paths, circles = render_composition(family_id, rng)
        return paths, circles, None
    if is_hero_template_id(family_id):
        paths, circles = render_hero_template(family_id, rng)
        return paths, circles, None
    if family_id == "primitive_compose":
        max_pieces = 1 if variation_only else 2
        paths, circles = _compose_from_primitives(rng, max_pieces=max_pieces)
        return paths, circles, None
    generator = _GENERATORS.get(family_id)
    if generator is None:
        paths, circles = render_composition(pick_weighted_compose(rng, "neutral"), rng)
        return paths, circles, None
    paths, circles = generator(rng)
    return paths, circles, None


def _append_dot_accent(
    rng: _GlyphRng,
    paths: list[dict[str, Any]],
    circles: list[dict[str, Any]],
) -> None:
    """Family-safe accent — single dot only; never stack a second recipe."""
    if len(paths) >= 3 or len(circles) >= 2:
        return
    cx, cy = rng.coord(), rng.coord()
    r = round(1.4 + (rng._next() % 4) * 0.3, 2)
    circles.append(_circle(cx, cy, r, opacity=0.6))


def is_valid_glyph_family_id(value: str) -> bool:
    trimmed = (value or "").strip()
    return trimmed in bucket_motif_pool("neutral")


def operator_kind_family_ids() -> tuple[str, ...]:
    return CHARACTER_RECIPE_IDS + PLACE_RECIPE_IDS + PERSON_RECIPE_IDS


def grammar_lab_family_ids() -> tuple[str, ...]:
    deprecated = tuple(DEPRECATED_HERO_ALIASES.keys())
    return (
        SLOT_RECIPE_IDS
        + ICON_RECIPE_IDS
        + COMPOSE_FAMILY_IDS
        + HERO_TEMPLATE_IDS
        + deprecated
        + _ALL_GENERATOR_IDS
        + ("primitive_compose",)
    )


def is_operator_kind_family_id(value: str) -> bool:
    return (value or "").strip() in operator_kind_family_ids()


def is_grammar_lab_family_id(value: str) -> bool:
    return (value or "").strip() in grammar_lab_family_ids()


def _resolve_family_id(
    family_id: str | None,
    rng: _GlyphRng,
    bucket: str,
    *,
    glyph_name: str = "",
    hail_name: str = "",
    remix: bool = False,
) -> str:
    trimmed = (family_id or "").strip()
    if not remix and trimmed and is_valid_glyph_family_id(trimmed):
        return trimmed
    return _pick_initial_family(
        rng,
        bucket,
        glyph_name=glyph_name,
        hail_name=hail_name,
        remix=remix,
    )


def _graph_signature(paths: list[dict[str, Any]], circles: list[dict[str, Any]]) -> str:
    material = "|".join(str(p.get("d", "")) for p in paths) + "#" + "|".join(
        f"{c.get('cx')}:{c.get('cy')}:{c.get('r')}" for c in circles
    )
    return hashlib.sha256(material.encode("utf-8")).hexdigest()[:16]


def generate_procedural_graph(
    *,
    glyph_name: str,
    hail_name: str,
    seed: int | None,
    digest: bytes,
    glyph_family_id: str | None = None,
    variation_only: bool = False,
    remix: bool = False,
    _profile_retry: int = 0,
) -> tuple[dict[str, Any], str]:
    bucket = resolve_semantic_bucket(glyph_name, hail_name, digest)
    rng = _GlyphRng(digest, seed)

    if variation_only or remix:
        trimmed = (glyph_family_id or "").strip()
        if trimmed and (is_operator_kind_family_id(trimmed) or is_grammar_lab_family_id(trimmed)):
            family_id = trimmed
        else:
            from hails.hail_glyph_operator_seed import pick_operator_family_id

            family_id = pick_operator_family_id(
                glyph_name=glyph_name,
                hail_name=hail_name,
            )
    else:
        from hails.hail_glyph_operator_seed import pick_operator_family_id

        family_id = pick_operator_family_id(
            glyph_name=glyph_name,
            hail_name=hail_name,
            glyph_family_id=glyph_family_id,
        )

    jitter = variation_only or remix or _is_kind_family(family_id)
    paths, circles, composition = _render_family(
        family_id,
        rng,
        variation_only=jitter,
        remix=False,
    )

    if is_slot_recipe_id(family_id) and not is_valid_composition(paths, circles):
        retry_seed = None if seed is None else _normalize_seed((seed or 0) + 17)
        paths, circles, composition = render_slot_recipe(
            family_id,
            _GlyphRng(digest, retry_seed),
            variation_only=variation_only,
        )

    if is_compose_family_id(family_id) and not is_valid_composition(paths, circles):
        retry_seed = None if seed is None else _normalize_seed((seed or 0) + 17)
        paths, circles = render_composition(family_id, _GlyphRng(digest, retry_seed))
        composition = None

    if not is_slot_recipe_id(family_id) and not is_icon_recipe_id(family_id) and not is_character_recipe_id(
        family_id
    ) and not is_place_recipe_id(family_id) and not is_person_recipe_id(family_id) and not is_compose_family_id(
        family_id
    ) and not is_hero_template_id(family_id):
        accent_chance = 18 if variation_only else 22
        if rng.chance(accent_chance):
            _append_dot_accent(rng, paths, circles)

    if not paths:
        paths, circles = _emit_primitive("line", rng, primary=True)

    depth_paths = apply_canonical_depth_pass(paths)

    graph: dict[str, Any] = {
        "version": PROCEDURAL_GRAPH_VERSION,
        "generator_id": _canonical_family_id(family_id),
        "semantic_bucket": bucket,
        "paths": depth_paths,
        "signature": _graph_signature(depth_paths, circles[:2]),
    }
    if composition:
        graph["composition"] = composition
        representation = composition.get("representation")
        if representation:
            graph["representation"] = representation
    if circles:
        graph["circles"] = circles[:2]
    graph = normalize_procedural_graph_envelope(graph)
    if remix or variation_only or _is_kind_family(family_id):
        graph = apply_procedural_graph_instance_jitter(graph, rng)
        graph = uplift_procedural_graph_hero_focal_mass(graph)

    if seed is not None and _profile_retry < 2:
        from hails.hail_glyph_hero_quality import verify_dual_profile_castable_lead
        from hails.hail_glyph_tv_projection import project_procedural_graph_for_google_tv

        if verify_dual_profile_castable_lead(graph, project_procedural_graph_for_google_tv(graph)):
            return generate_procedural_graph(
                glyph_name=glyph_name,
                hail_name=hail_name,
                seed=_normalize_seed((seed or 0) + 17 * (_profile_retry + 1)),
                digest=digest,
                glyph_family_id=glyph_family_id,
                variation_only=variation_only,
                remix=remix,
                _profile_retry=_profile_retry + 1,
            )

    return graph, bucket


def is_valid_procedural_graph(value: Any) -> bool:
    if not isinstance(value, dict):
        return False
    version = _parse_graph_version(value.get("version"))
    if version is None or version != PROCEDURAL_GRAPH_VERSION:
        return False
    paths = value.get("paths")
    if not isinstance(paths, list) or not paths:
        return False
    for row in paths:
        if not isinstance(row, dict):
            return False
        d = row.get("d")
        if not isinstance(d, str) or not d.strip():
            return False
    circles = value.get("circles")
    if circles is not None:
        if not isinstance(circles, list):
            return False
        for row in circles:
            if not isinstance(row, dict):
                return False
            if not all(isinstance(row.get(key), (int, float)) for key in ("cx", "cy", "r")):
                return False
    return True


def is_valid_procedural_motif_id(value: str) -> bool:
    return value in PROCEDURAL_MOTIF_IDS


def bucket_motif_pool(bucket: str) -> tuple[str, ...]:
    """Kind generators, slot grammar-lab, icons, and legacy families."""
    del bucket
    deprecated = tuple(DEPRECATED_HERO_ALIASES.keys())
    return (
        CHARACTER_RECIPE_IDS
        + PLACE_RECIPE_IDS
        + PERSON_RECIPE_IDS
        + SLOT_RECIPE_IDS
        + ICON_RECIPE_IDS
        + COMPOSE_FAMILY_IDS
        + HERO_TEMPLATE_IDS
        + deprecated
        + _ALL_GENERATOR_IDS
        + ("primitive_compose",)
    )

"""Fleet combadge — reference-traced TNG prop (stroke-led, 48×48).

Source of truth: ``config/hails/plot-fixtures/assets/combadge-tng-traced.svg``.
Plot fixtures use **authored** paths (no envelope). Delivery/register applies envelope in P2.

Voyager deferred: ``char_combadge_voyager_v1`` — trace ``combadge-voyager-reference.png``
to a second SVG after TNG P1 operator sign-off; bar uses even-odd side pill cutouts + delta.
Do not promote Voyager to plot fixture until TNG P1 exits.
"""

from __future__ import annotations

import json
import re
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Any, Final, Protocol

COMBADGE_DELTA_V1: Final[str] = "char_combadge_delta_v1"
COMBADGE_VOYAGER_V1: Final[str] = "char_combadge_voyager_v1"
COMBADGE_LEAD_PHRASE: Final[str] = "delta combadge"
COMBADGE_PROP_TYPE: Final[str] = "fleet-combadge"
COMBADGE_PLOT_ID: Final[str] = "custom-combadge-plot"
COMBADGE_GLYPH_ID: Final[str] = "custom-combadge"

_TNG_TRACED_SVG: Final[str] = "config/hails/plot-fixtures/assets/combadge-tng-traced.svg"
_TNG_REFERENCE_PNG: Final[str] = "config/hails/plot-fixtures/assets/combadge-tng-reference.png"

# Voyager post-P1 — paths kept for keyword routing only (not plot gate)
_VOYAGER_BAR_D: Final[str] = (
    "M11 21.5 C11 18.5 14 16.5 18 16.5 L30 16.5 C34 16.5 37 18.5 37 21.5 "
    "L37 25.5 C37 28.5 34 30.5 30 30.5 L18 30.5 C14 30.5 11 28.5 11 25.5 L11 21.5 Z "
    "M15.5 20.8 C15.5 19.6 16.4 18.8 17.6 18.8 L19.8 18.8 C21 18.8 21.9 19.6 21.9 20.8 "
    "L21.9 22.2 C21.9 23.4 21 24.2 19.8 24.2 L17.6 24.2 C16.4 24.2 15.5 23.4 15.5 22.2 "
    "L15.5 20.8 Z M26.1 20.8 C26.1 19.6 27 18.8 28.2 18.8 L30.4 18.8 C31.6 18.8 32.5 19.6 "
    "32.5 20.8 L32.5 22.2 C32.5 23.4 31.6 24.2 30.4 24.2 L28.2 24.2 C27 24.2 26.1 23.4 "
    "26.1 22.2 L26.1 20.8 Z"
)
_VOYAGER_DELTA_D: Final[str] = (
    "M24 9.5 C17 11.5 12.5 16.5 12 22 C11.5 27 14 31 17 33.5 L18.5 38 L21.5 34 "
    "Q24 30 24 33 Q24 30 27.5 34 L29 38 L30.5 33.5 C33.5 31 36 27 35.5 22 "
    "C35 16.5 31 11.5 24 9.5 Z"
)

_TOKEN_RE = re.compile(r"[a-z0-9]+")
_SVG_NS = {"svg": "http://www.w3.org/2000/svg"}
_ROLE_ORDER: Final[tuple[str, ...]] = ("accent", "mass")

_COMBADGE_KEYWORDS: Final[frozenset[str]] = frozenset(
    {
        "combadge",
        "communicator",
        "starfleet",
        "trek",
        "federation",
        "insignia",
        "badge",
        "delta",
        "voyager",
        "enterprise",
        "picard",
    }
)
_VOYAGER_KEYWORDS: Final[frozenset[str]] = frozenset({"voyager", "ds9", "deep-space-nine"})


class _CombadgeRng(Protocol):
    def _next(self) -> int: ...
    def stroke_width(self, primary: bool = True) -> float: ...


def combadge_assets_dir() -> Path:
    from settings import _resolve_repo_root

    return _resolve_repo_root() / "config/hails/plot-fixtures/assets"


def combadge_tng_traced_svg_path() -> Path:
    from settings import _resolve_repo_root

    return _resolve_repo_root() / _TNG_TRACED_SVG


def combadge_tng_reference_png_path() -> Path:
    from settings import _resolve_repo_root

    return _resolve_repo_root() / _TNG_REFERENCE_PNG


def _parse_svg_float(value: str | None, default: float) -> float:
    if value is None:
        return default
    text = str(value).strip()
    if not text:
        return default
    try:
        return float(text)
    except ValueError:
        match = re.search(r"[\d.]+", text)
        return float(match.group(0)) if match else default


def load_traced_svg_paths(svg_path: Path | None = None) -> list[dict[str, Any]]:
    """Load stroke paths from traced SVG — plot proof source of truth."""
    from hails.glyph_svg_normalize import CANONICAL_VIEWBOX, path_bbox

    path = svg_path or combadge_tng_traced_svg_path()
    root = ET.parse(path).getroot()
    rows: list[tuple[int, dict[str, Any]]] = []
    for index, element in enumerate(root.findall(".//svg:path", _SVG_NS) + root.findall(".//path")):
        d = (element.get("d") or "").strip()
        if not d:
            continue
        role = (element.get("data-combadge-role") or element.get("id") or "").strip().lower()
        if role == "backing":
            role = "accent"
        if role not in _ROLE_ORDER:
            role = _ROLE_ORDER[min(index, len(_ROLE_ORDER) - 1)]
        sw = _parse_svg_float(element.get("stroke-width"), 2.85)
        opacity = _parse_svg_float(element.get("opacity"), 1.0)
        fill_raw = (element.get("fill") or "none").strip()
        fill_opacity = _parse_svg_float(element.get("fill-opacity"), 1.0)
        if fill_raw.lower() in {"", "none"}:
            fill = "none"
            path_opacity = round(min(1.0, max(0.0, opacity)), 2)
        else:
            fill = "currentColor"
            path_opacity = round(min(1.0, max(0.0, opacity * fill_opacity)), 2)
        row: dict[str, Any] = {
            "d": d,
            "stroke": "currentColor",
            "stroke_width": round(max(2.0, sw), 2),
            "fill": fill,
            "opacity": path_opacity,
            "stroke_linecap": "round",
            "stroke_linejoin": "round",
            "role": role,
        }
        fill_rule = (element.get("fill-rule") or "").strip()
        if fill_rule:
            row["fill_rule"] = fill_rule
        rows.append((_ROLE_ORDER.index(role) if role in _ROLE_ORDER else index, row))
    rows.sort(key=lambda item: item[0])
    paths = [row for _rank, row in rows]
    if len(paths) != 2:
        raise ValueError(f"combadge traced SVG must contain exactly 2 paths, got {len(paths)}")
    boxes = [path_bbox(str(row.get("d") or "")) for row in paths]
    boxes = [box for box in boxes if box is not None]
    if boxes:
        min_x = min(box[0] for box in boxes)
        min_y = min(box[1] for box in boxes)
        max_x = max(box[2] for box in boxes)
        max_y = max(box[3] for box in boxes)
        if min_x < -0.5 or min_y < -0.5 or max_x > CANONICAL_VIEWBOX + 0.5 or max_y > CANONICAL_VIEWBOX + 0.5:
            raise ValueError(
                f"combadge traced SVG paths must fit 0–{CANONICAL_VIEWBOX} grid "
                f"(got bbox {min_x:.1f},{min_y:.1f}–{max_x:.1f},{max_y:.1f}); re-import via normalize"
            )
    return paths


def _path(
    d: str,
    *,
    stroke_width: float = 2.85,
    fill: str = "none",
    opacity: float = 1.0,
    stroke: str = "currentColor",
    stroke_linecap: str = "round",
    stroke_linejoin: str | None = "round",
    fill_rule: str | None = None,
    role: str | None = None,
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
    if fill_rule:
        row["fill_rule"] = fill_rule
    if role:
        row["role"] = role
    return row


def combadge_keywords_match(glyph_name: str, hail_name: str = "") -> bool:
    tokens = set(_TOKEN_RE.findall(f"{glyph_name} {hail_name}".lower()))
    return bool(tokens & _COMBADGE_KEYWORDS)


def voyager_keywords_match(glyph_name: str, hail_name: str = "") -> bool:
    tokens = set(_TOKEN_RE.findall(f"{glyph_name} {hail_name}".lower()))
    return bool(tokens & _VOYAGER_KEYWORDS)


def is_combadge_recipe_id(value: str) -> bool:
    return (value or "").strip() in {COMBADGE_DELTA_V1, COMBADGE_VOYAGER_V1}


def pick_combadge_recipe_id(
    *,
    glyph_name: str = "",
    hail_name: str = "",
    explicit: str = "",
) -> str:
    trimmed = (explicit or "").strip()
    if trimmed == COMBADGE_VOYAGER_V1:
        return COMBADGE_VOYAGER_V1
    if trimmed == COMBADGE_DELTA_V1:
        return COMBADGE_DELTA_V1
    if voyager_keywords_match(glyph_name, hail_name):
        return COMBADGE_VOYAGER_V1
    return COMBADGE_DELTA_V1


def _tng_combadge_paths(
    rng: _CombadgeRng,
    *,
    variation_only: bool,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    del rng, variation_only
    paths = [dict(row) for row in load_traced_svg_paths()]
    return paths, []


def _voyager_combadge_paths(
    rng: _CombadgeRng,
    *,
    variation_only: bool,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    del variation_only, rng
    bar = _path(
        _VOYAGER_BAR_D,
        stroke_width=2.5,
        fill_rule="evenodd",
        opacity=0.75,
        role="accent",
    )
    delta = _path(_VOYAGER_DELTA_D, stroke_width=2.85, opacity=1.0, role="mass")
    return [bar, delta], []


def render_combadge_recipe(
    recipe_id: str,
    rng: _CombadgeRng,
    *,
    variation_only: bool = False,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]], dict[str, Any]]:
    if variation_only:
        del variation_only
    family = pick_combadge_recipe_id(explicit=(recipe_id or "").strip())
    if family == COMBADGE_VOYAGER_V1:
        paths, circles = _voyager_combadge_paths(rng, variation_only=False)
        character_id = "combadge_voyager"
    else:
        paths, circles = _tng_combadge_paths(rng, variation_only=False)
        character_id = "combadge_delta_tng"
    composition: dict[str, Any] = {
        "schema": "char_v1",
        "character_id": character_id,
        "lead_phrase": COMBADGE_LEAD_PHRASE,
        "character_type": COMBADGE_PROP_TYPE,
        "anchor": {"cx": 24, "cy": 24},
    }
    return paths, circles, composition


def build_combadge_authored_graph(
    *,
    recipe_id: str = COMBADGE_DELTA_V1,
) -> dict[str, Any]:
    """Plot / judgment-scale graph — authored paths only, no envelope mutation."""
    from hails.hail_glyph_procedural import PROCEDURAL_GRAPH_VERSION, _graph_signature

    rng = _CombRngStub(0)
    paths, circles, composition = render_combadge_recipe(recipe_id, rng, variation_only=False)
    generator_id = pick_combadge_recipe_id(explicit=recipe_id)
    graph: dict[str, Any] = {
        "version": PROCEDURAL_GRAPH_VERSION,
        "generator_id": generator_id,
        "paths": paths,
        "composition": composition,
        "signature": _graph_signature(paths, circles),
    }
    if circles:
        graph["circles"] = circles
    return graph


def build_combadge_procedural_graph(
    *,
    recipe_id: str = COMBADGE_DELTA_V1,
    variation_only: bool = False,
    seed: int = 0,
    for_delivery: bool = True,
) -> dict[str, Any]:
    """Delivery graph — envelope applied once (P2 register / Forge), not for plot proof."""
    from hails.hail_glyph_envelope import normalize_procedural_graph_envelope

    if variation_only:
        raise ValueError("combadge proof subject forbids variation_only")
    del seed
    graph = build_combadge_authored_graph(recipe_id=recipe_id)
    if not for_delivery:
        return graph
    return normalize_procedural_graph_envelope(graph)


class _CombRngStub:
    def __init__(self, seed: int) -> None:
        self._seed = seed

    def _next(self) -> int:
        self._seed = (self._seed * 1103515245 + 12345) & 0x7FFFFFFF
        return self._seed % 256

    def stroke_width(self, primary: bool = True) -> float:
        del primary
        return 2.85


def build_combadge_plot_fixture() -> dict[str, Any]:
    graph = build_combadge_authored_graph(recipe_id=COMBADGE_DELTA_V1)
    return {
        "plot_id": COMBADGE_PLOT_ID,
        "glyph_id": COMBADGE_GLYPH_ID,
        "label": "Combadge",
        "subject_phrase": COMBADGE_LEAD_PHRASE,
        "proof_mode": True,
        "recipe_id": COMBADGE_DELTA_V1,
        "reference_asset": "combadge-tng-reference.png",
        "traced_svg": "combadge-tng-traced.svg",
        "procedural_graph": graph,
    }


def write_combadge_plot_fixture(path: Path | None = None) -> Path:
    from settings import _resolve_repo_root

    target = path or (
        _resolve_repo_root() / "config/hails/plot-fixtures/custom-combadge-plot.fixture.json"
    )
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(build_combadge_plot_fixture(), indent=2) + "\n", encoding="utf-8")
    return target


def write_combadge_reference_svg(path: Path | None = None) -> Path:
    """Mirror traced SVG to reports (stroke reference)."""
    from settings import _resolve_repo_root

    source = combadge_tng_traced_svg_path()
    target = path or (_resolve_repo_root() / "reports/glyph-hero-pass/custom-combadge-plot.svg")
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(source.read_text(encoding="utf-8"), encoding="utf-8")
    return target


def build_combadge_glyph_spec(
    *,
    glyph_id: str = COMBADGE_GLYPH_ID,
    label: str = "Combadge",
    seed: int = 90618001,
) -> dict[str, Any]:
    """Forge library entry — delivery graph with envelope."""
    from hails.hails_composer import seed_glyph_spec

    spec = seed_glyph_spec(
        glyph_name=label,
        glyph_id=glyph_id,
        glyph_family_id=COMBADGE_DELTA_V1,
        seed=seed,
        variation_only=False,
        scale="large",
        palette_id="axiom_dark_cyan",
        effect_id="none",
    )
    spec["label"] = label
    spec["source"] = "composer"
    spec["archived"] = False
    return spec


def build_star_trek_combadge_spec(
    *,
    glyph_id: str = "custom-star-trek",
    seed: int = 170100,
) -> dict[str, Any]:
    from hails.hails_composer import seed_glyph_spec

    return seed_glyph_spec(
        glyph_name="Star Trek",
        glyph_id=glyph_id,
        glyph_family_id=COMBADGE_DELTA_V1,
        seed=seed,
        variation_only=True,
        scale="large",
        palette_id="axiom_dark_cyan",
        effect_id="transporter",
    )

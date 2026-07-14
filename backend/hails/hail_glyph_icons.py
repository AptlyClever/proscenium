"""Object/icon glyph generator — pictogram paths inside ghost-shield envelope.

Curated stroke icons at 48×48 (original simplified pictograms, monochrome).
Session 2 representation kind for Forge seeds. See docs/hails/glyph-envelope-v001.md.
"""

from __future__ import annotations

import re
from typing import Any, Final, Protocol

from hails.hail_glyph_envelope import scale_path_d

ICON_PREFIX: Final[str] = "icon_"
ICON_GENERATOR_ID: Final[str] = "phosphor_compat_v1"
_OPTICAL_ANCHOR: Final[tuple[int, int]] = (24, 24)

# Stroke pictograms — single-color paths centered for 48×48 optical grid.
_ICON_PATHS: dict[str, tuple[str, ...]] = {
    "home": (
        "M24 13 L34 21 L34 33 L28 33 L28 26 L20 26 L20 33 L14 33 L14 21 Z",
    ),
    "download": (
        "M24 14 L24 28 M18 22 L24 28 L30 22",
        "M16 34 L32 34",
    ),
    "bell": (
        "M24 34 L18 34 C18 27 16 25 16 22 C16 18 19 15 24 15 C29 15 32 18 32 22 C32 25 30 27 30 34 Z",
        "M21 34 C21 36 22 37 24 37 C26 37 27 36 27 34",
    ),
    "package": (
        "M14 18 L24 12 L34 18 L34 32 L14 32 Z",
        "M14 18 L24 24 L34 18",
        "M24 24 L24 32",
    ),
    "send": (
        "M14 24 L32 16 L26 30 L22 26 L14 32 Z",
    ),
    "eye": (
        "M14 24 C17 18 31 18 34 24 C31 30 17 30 14 24 Z",
        "M24 21 C26 21 27 22 27 24 C27 26 26 27 24 27 C22 27 21 26 21 24 C21 22 22 21 24 21 Z",
    ),
    "heart": (
        "M24 32 C18 27 14 24 14 20 C14 17 16 15 19 15 C21 15 23 16 24 18 C25 16 27 15 29 15 C32 15 34 17 34 20 C34 24 30 27 24 32 Z",
    ),
    "star": (
        "M24 13 L27 21 L35 21 L28 26 L31 34 L24 29 L17 34 L20 26 L13 21 L21 21 Z",
    ),
    "bolt": (
        "M28 13 L18 27 L23 27 L20 35 L30 21 L25 21 Z",
    ),
    "pin": (
        "M24 13 C20 13 17 16 17 20 C17 24 24 34 24 34 C24 34 31 24 31 20 C31 16 28 13 24 13 Z",
        "M24 18 C25.5 18 26.5 19 26.5 20.5 C26.5 22 25.5 23 24 23 C22.5 23 21.5 22 21.5 20.5 C21.5 19 22.5 18 24 18 Z",
    ),
    "play": (
        "M18 15 L34 24 L18 33 Z",
    ),
    "warning": (
        "M24 12 L35 34 L13 34 Z",
        "M24 20 L24 27",
        "M24 30 L24 31",
    ),
    "chat": (
        "M14 16 L34 16 L34 28 L24 28 L18 33 L18 28 L14 28 Z",
    ),
    "music": (
        "M28 14 L28 28 C28 30 26 31 24 31 C22 31 20 29 20 27 C20 25 22 23 24 23 C25 23 26 24 27 24 L27 18 L20 20",
    ),
    "wrench": (
        "M30 18 C28 16 25 16 23 18 L16 25 C14 27 14 30 16 32 C18 34 21 34 23 32 L30 25 C32 23 32 20 30 18 Z",
        "M22 26 L26 22",
    ),
    "gamepad": (
        "M16 22 C16 18 19 15 24 15 C29 15 32 18 32 22 L32 28 C32 31 29 34 24 34 C19 34 16 31 16 28 Z",
        "M20 24 L20 26 M19 25 L21 25",
        "M27 23 L29 25 L27 27",
    ),
    "moon": (
        "M28 18 C28 13 22 11 18 15 C14 19 15 27 21 31 C17 28 16 22 20 18 C23 15 27 15 28 18 Z",
    ),
    "sun": (
        "M24 18 a6 6 0 1 1 0 12 a6 6 0 1 1 0 -12",
        "M24 13 L24 15 M24 33 L24 35 M13 24 L15 24 M33 24 L35 24",
        "M17 17 L18 19 M30 30 L31 31 M30 18 L31 17 M17 31 L18 30",
    ),
    "clock": (
        "M24 14 a10 10 0 1 1 0 20 a10 10 0 1 1 0 -20",
        "M24 24 L24 18 M24 24 L29 27",
    ),
    "phone": (
        "M20 14 L28 14 C29 14 30 15 30 17 L30 31 C30 33 29 34 28 34 L20 34 C19 34 18 33 18 31 L18 17 C18 15 19 14 20 14 Z",
        "M23 31 L25 31",
    ),
    "tv": (
        "M14 16 L34 16 L32 27 L16 27 Z",
        "M20 27 L20 31 L28 31 L28 27",
        "M17 31 L31 31",
    ),
    "utensils": (
        "M19 14 L19 28 M17 14 L21 14 M19 19 L17 17 M19 19 L21 17",
        "M29 14 L29 30 M27 14 L31 14",
    ),
    "car": (
        "M14 26 L17 21 L31 21 L34 26 L34 30 L14 30 Z",
        "M18 30 a2.5 2.5 0 1 1 0 0.01",
        "M28 30 a2.5 2.5 0 1 1 0 0.01",
    ),
    "key": (
        "M18 28 L18 21 C18 17 21 14 25 14 C28 14 31 16 31 20 C31 23 28 26 25 26 L24 26 L24 32",
        "M22 32 L24 34 L26 32",
    ),
    "book": (
        "M16 16 L16 32 L24 29 L32 32 L32 16 L24 19 Z",
        "M24 19 L24 29",
    ),
    "search": (
        "M20 20 a6 6 0 1 1 12 0 a6 6 0 1 1 -12 0",
        "M28 28 L33 33",
    ),
    "check": (
        "M15 24 L22 31 L34 17",
    ),
    "paw": (
        "M19 21 a2 2 0 1 1 0.01 0 M29 21 a2 2 0 1 1 0.01 0 M16 26 a2 2 0 1 1 0.01 0 M32 26 a2 2 0 1 1 0.01 0",
        "M24 28 C20 28 18 31 18 34 C18 36 20 37 24 37 C28 37 30 36 30 34 C30 31 28 28 24 28 Z",
    ),
    "gear": (
        "M24 15 L26 15 L27 12 L29 13 L28 16 L31 18 L28 19 L29 22 L27 21 L26 24 L22 24 L21 21 L19 22 L20 19 L17 18 L20 16 L19 13 L21 12 L22 15 Z",
        "M24 20 a4 4 0 1 1 0 0.01",
    ),
    "wifi": (
        "M15 29 C20 23 28 23 33 29",
        "M19 32 C22 28 26 28 29 32",
        "M23 35 a1.5 1.5 0 1 1 0 0.01",
    ),
    "gift": (
        "M16 22 L32 22 L32 32 L16 32 Z",
        "M16 22 L24 15 L32 22",
        "M24 15 L24 32 M20 15 C22 17 26 17 28 15",
    ),
    "coffee": (
        "M16 20 L16 30 C16 32 18 33 20 33 L26 33 C28 33 30 32 30 30 L30 27 L32 27",
        "M18 20 L28 20",
    ),
}

ICON_IDS: Final[tuple[str, ...]] = tuple(sorted(_ICON_PATHS.keys()))
ICON_RECIPE_IDS: Final[tuple[str, ...]] = tuple(f"{ICON_PREFIX}{icon_id}" for icon_id in ICON_IDS)

_STOP_TOKENS: Final[frozenset[str]] = frozenset(
    {"a", "an", "custom", "glyph", "hail", "my", "new", "the", "your"}
)

_KEYWORD_ICONS: dict[str, tuple[str, ...]] = {
    "home": ("home", "room", "bed", "house", "kitchen", "family", "bedroom", "gather"),
    "download": ("download", "conduit", "save", "file", "archive", "fetch", "pull"),
    "bell": ("alert", "warn", "ping", "notify", "bell", "urgent", "call", "doorbell", "ding"),
    "package": ("package", "box", "deliver", "ship", "mail", "order"),
    "send": ("send", "route", "travel", "port", "transporter", "transport", "go", "move"),
    "eye": ("see", "look", "eye", "watch", "view", "sniff", "seed", "vision", "peek"),
    "heart": ("love", "heart", "nice", "joy"),
    "star": ("star", "cool", "favorite", "favourite"),
    "bolt": ("bolt", "power", "energy", "fast", "zap", "electric"),
    "pin": ("here", "place", "map", "location", "pin", "where"),
    "play": ("play", "fun", "party"),
    "warning": ("stop", "wait", "help", "blech", "caution", "danger"),
    "chat": ("hey", "say", "chat", "message", "talk", "text", "speak"),
    "music": ("music", "song", "dance", "audio"),
    "wrench": ("fix", "tool", "work", "build", "repair"),
    "gamepad": ("game", "gamepad", "controller", "arcade", "xbox", "playstation"),
    "moon": ("sleep", "night", "moon", "bedtime", "tired", "nap"),
    "sun": ("sun", "morning", "wake", "day", "bright", "sunny"),
    "clock": ("clock", "time", "timer", "late", "soon", "schedule"),
    "phone": ("phone", "mobile", "cell", "ring", "dial"),
    "tv": ("tv", "television", "screen", "netflix", "show", "movie", "watch"),
    "utensils": ("food", "eat", "lunch", "dinner", "meal", "hungry", "fork", "plate"),
    "car": ("car", "drive", "road", "pickup", "commute", "leave"),
    "key": ("key", "door", "lock", "unlock", "entry"),
    "book": ("book", "read", "study", "homework", "library"),
    "search": ("search", "find", "seek", "lookup", "query"),
    "check": ("check", "done", "yes", "ok", "complete", "ready", "finished"),
    "paw": ("pet", "dog", "cat", "paw", "animal"),
    "gear": ("gear", "settings", "config", "setup", "prefs", "preferences"),
    "wifi": ("wifi", "network", "internet", "online", "connected"),
    "gift": ("gift", "present", "birthday", "surprise"),
    "coffee": ("coffee", "tea", "cafe", "brew", "morning"),
}

_BUCKET_ICON_BIAS: dict[str, frozenset[str]] = {
    "sense": frozenset({"eye", "pin", "bell", "search", "tv"}),
    "motion": frozenset({"send", "bolt", "download", "package", "car"}),
    "signal": frozenset({"bell", "warning", "chat", "bolt", "phone", "wifi"}),
    "gather": frozenset({"home", "pin", "package", "tv", "utensils", "coffee"}),
    "spark": frozenset({"play", "star", "heart", "gamepad", "music", "gift", "sun"}),
    "neutral": frozenset(ICON_IDS),
}

_BIAS_WEIGHT: Final[int] = 4
_DEFAULT_WEIGHT: Final[int] = 1


class _IconRng(Protocol):
    def _next(self) -> int: ...
    def pick_weighted(self, items: tuple[str, ...], weights: tuple[int, ...]) -> str: ...
    def stroke_width(self, primary: bool = True) -> float: ...


def is_icon_recipe_id(value: str) -> bool:
    trimmed = (value or "").strip()
    return trimmed.startswith(ICON_PREFIX) and trimmed[len(ICON_PREFIX) :] in _ICON_PATHS


def icon_id_from_recipe(recipe_id: str) -> str:
    return recipe_id.strip()[len(ICON_PREFIX) :]


def _tokenize(text: str) -> set[str]:
    return {token for token in re.split(r"[^a-z0-9]+", text.lower()) if token and token not in _STOP_TOKENS}


def resolve_keyword_icon_match(glyph_name: str, hail_name: str) -> tuple[str, int] | None:
    """Score keyword hits — glyph-name tokens weigh more than hail-name tokens."""
    glyph_tokens = _tokenize(glyph_name)
    hail_tokens = _tokenize(hail_name)
    if not glyph_tokens and not hail_tokens:
        return None
    best_id: str | None = None
    best_score = 0
    best_hits = 0
    for icon_id, keywords in _KEYWORD_ICONS.items():
        score = 0
        hits = 0
        for keyword in keywords:
            if keyword in glyph_tokens:
                score += 3
                hits += 1
            if keyword in hail_tokens:
                score += 2
                hits += 1
        if score > best_score or (score == best_score and hits > best_hits):
            best_score = score
            best_hits = hits
            best_id = icon_id
    if best_id is None or best_score <= 0:
        return None
    return best_id, best_score


def icon_kind_probability(*, glyph_name: str, hail_name: str, bucket: str, remix: bool = False) -> int:
    """Percent chance a new seed picks icon kind vs emblem (0–99 scale for rng roll)."""
    if remix:
        return 58
    match = resolve_keyword_icon_match(glyph_name, hail_name)
    if match:
        _icon_id, score = match
        if score >= 6:
            return 96
        if score >= 3:
            return 90
        return 85
    bucket_icon_prior: dict[str, int] = {
        "motion": 72,
        "gather": 70,
        "sense": 68,
        "spark": 68,
        "signal": 65,
        "neutral": 65,
    }
    return bucket_icon_prior.get(bucket, 65)


def pick_icon_recipe_id(
    rng: _IconRng,
    bucket: str,
    *,
    glyph_name: str = "",
    hail_name: str = "",
    remix: bool = False,
) -> str:
    match = resolve_keyword_icon_match(glyph_name, hail_name)
    biased = _BUCKET_ICON_BIAS.get(bucket, _BUCKET_ICON_BIAS["neutral"])
    keyword_icon_id = match[0] if match else None
    keyword_score = match[1] if match else 0
    if not remix and match:
        icon_id, score = match
        if score >= 3 or rng._next() % 100 < 94:
            return f"{ICON_PREFIX}{icon_id}"
    weights: list[int] = []
    for icon_id in ICON_IDS:
        weight = _BIAS_WEIGHT if icon_id in biased else _DEFAULT_WEIGHT
        if keyword_icon_id == icon_id:
            weight += max(3, keyword_score * 2)
        weights.append(weight)
    icon_id = rng.pick_weighted(ICON_IDS, tuple(weights))
    return f"{ICON_PREFIX}{icon_id}"


def _instance_scale(rng: _IconRng) -> float:
    pct = 88 + (rng._next() % 25)
    return pct / 100.0


def _path(
    d: str,
    *,
    stroke_width: float = 2.5,
    opacity: float = 1.0,
) -> dict[str, Any]:
    return {
        "d": d,
        "stroke": "currentColor",
        "stroke_width": stroke_width,
        "fill": "none",
        "opacity": opacity,
        "stroke_linecap": "round",
        "stroke_linejoin": "round",
    }


def render_icon_recipe(
    recipe_id: str,
    rng: _IconRng,
    *,
    variation_only: bool = False,
    remix: bool = False,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]], dict[str, Any]]:
    icon_id = icon_id_from_recipe(recipe_id)
    if icon_id not in _ICON_PATHS:
        raise ValueError(f"unknown icon recipe: {recipe_id}")
    sw = rng.stroke_width(True)
    if variation_only or remix:
        delta = (rng._next() % 5) * 0.08
        sw = round(max(2.0, min(3.2, sw + delta - 0.16)), 2)
    paths = [_path(d, stroke_width=sw) for d in _ICON_PATHS[icon_id][:3]]
    if variation_only or remix:
        cx, cy = float(_OPTICAL_ANCHOR[0]), float(_OPTICAL_ANCHOR[1])
        factor = _instance_scale(rng)
        paths = [{**row, "d": scale_path_d(str(row["d"]), cx, cy, factor)} for row in paths]
    composition: dict[str, Any] = {
        "layout_id": "icon_centered",
        "anchor": {"cx": _OPTICAL_ANCHOR[0], "cy": _OPTICAL_ANCHOR[1]},
        "representation": {
            "kind": "icon",
            "generator": ICON_GENERATOR_ID,
            "icon_id": icon_id,
        },
    }
    return paths, [], composition

"""Path roles and canonical depth layers for hero procedural graphs.

Step 20 — chain-tv-glyph-hero-engine-align. TV projection merges shadow roles
into charge strokes; see hail_glyph_tv_projection.py.
"""

from __future__ import annotations

from typing import Any, Final

PATH_ROLE_MASS: Final[str] = "mass"
PATH_ROLE_CHARGE: Final[str] = "charge"
PATH_ROLE_GROUND: Final[str] = "ground"
PATH_ROLE_ACCENT: Final[str] = "accent"
PATH_ROLE_SHADOW: Final[str] = "shadow"

ROLE_TRIM_PRIORITY: Final[tuple[str, ...]] = (
    PATH_ROLE_MASS,
    PATH_ROLE_CHARGE,
    PATH_ROLE_GROUND,
    PATH_ROLE_ACCENT,
    PATH_ROLE_SHADOW,
)

_CANONICAL_PATH_BUDGET: Final[int] = 10
_SHADOW_OPACITY_FACTOR: Final[float] = 0.42
_SHADOW_SW_BONUS: Final[float] = 0.6


def _role_rank(role: str | None) -> int:
    if not role:
        return ROLE_TRIM_PRIORITY.index(PATH_ROLE_CHARGE)
    try:
        return ROLE_TRIM_PRIORITY.index(role)
    except ValueError:
        return len(ROLE_TRIM_PRIORITY)


def annotate_path_roles(paths: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Tag paths with hero roles when not already set."""
    if not paths:
        return []
    ranked = sorted(
        enumerate(paths),
        key=lambda item: (
            float(item[1].get("opacity", 1.0)),
            float(item[1].get("stroke_width", 0.0)),
        ),
        reverse=True,
    )
    out: list[dict[str, Any]] = [dict(row) for row in paths]
    for rank, (index, row) in enumerate(ranked):
        if isinstance(row.get("role"), str) and row["role"].strip():
            continue
        opacity = float(row.get("opacity", 1.0))
        if rank == 0:
            role = PATH_ROLE_CHARGE
        elif opacity >= 0.72:
            role = PATH_ROLE_MASS
        elif opacity >= 0.5:
            role = PATH_ROLE_GROUND
        else:
            role = PATH_ROLE_ACCENT
        out[index]["role"] = role
    return out


def append_shadow_duplicate_paths(paths: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Duplicate charge/mass strokes as low-opacity shadow depth layers."""
    out = [dict(row) for row in paths]
    for row in paths:
        role = str(row.get("role") or "")
        if role not in {PATH_ROLE_CHARGE, PATH_ROLE_MASS}:
            continue
        if float(row.get("opacity", 1.0)) < 0.65:
            continue
        shadow = dict(row)
        shadow["role"] = PATH_ROLE_SHADOW
        shadow["opacity"] = round(
            min(0.55, float(row.get("opacity", 1.0)) * _SHADOW_OPACITY_FACTOR),
            2,
        )
        shadow["stroke_width"] = round(float(row.get("stroke_width", 2.5)) + _SHADOW_SW_BONUS, 2)
        out.append(shadow)
    return out[:_CANONICAL_PATH_BUDGET]


def apply_canonical_depth_pass(paths: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Annotate roles and append shadow duplicates for canonical hero graphs."""
    return append_shadow_duplicate_paths(annotate_path_roles(paths))


def merge_shadow_layers_for_tv(paths: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Fold shadow role paths into matching charge/mass strokes for TV ink budget."""
    non_shadow = [row for row in paths if row.get("role") != PATH_ROLE_SHADOW]
    if len(non_shadow) < 2:
        return [dict(row) for row in paths]

    shadows: dict[str, dict[str, Any]] = {}
    for row in paths:
        if row.get("role") == PATH_ROLE_SHADOW:
            d = str(row.get("d") or "").strip()
            if d:
                shadows[d] = row

    merged: list[dict[str, Any]] = []
    for row in paths:
        if row.get("role") == PATH_ROLE_SHADOW:
            continue
        out = dict(row)
        d = str(out.get("d") or "").strip()
        shadow = shadows.get(d)
        if shadow:
            out["opacity"] = round(
                min(
                    1.0,
                    float(out.get("opacity", 1.0))
                    + float(shadow.get("opacity", 0.3)) * 0.5,
                ),
                2,
            )
        merged.append(out)
    return merged


def trim_paths_by_role(paths: list[dict[str, Any]], *, max_paths: int) -> list[dict[str, Any]]:
    if len(paths) <= max_paths:
        return paths
    ranked = sorted(
        paths,
        key=lambda row: (
            _role_rank(str(row.get("role") or "")),
            -float(row.get("opacity", 1.0)),
            -float(row.get("stroke_width", 0.0)),
        ),
    )
    return ranked[:max_paths]

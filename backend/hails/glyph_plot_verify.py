"""Plot gate for static glyph fixtures — chain-glyph-plot-proof P1.

Validates authored procedural_graph fixtures before register / engine handoff.
Generation is paused; this is the subject-read gate alongside hero metrics.
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

from hails.hail_glyph_envelope import measure_glyph_content_metrics
from hails.hail_glyph_procedural import is_valid_procedural_graph
from hails.hail_glyph_tv_projection import project_procedural_graph_for_google_tv
from settings import _resolve_repo_root

_REPO_ROOT = _resolve_repo_root()
_DEFAULT_FIXTURE = _REPO_ROOT / "config/hails/plot-fixtures/custom-combadge-plot.fixture.json"
_PLOT_STRIP_OUT = _REPO_ROOT / "config/hails/plot-fixtures/custom-combadge-plot.strip.svg"

_COMBADGE_PRIMARY_PATH_COUNT = 2
_EMBLEM_GRAMMAR_ROLES = frozenset({"ground", "charge"})
_FOCAL_MIN_EDGE = 20.0
_MIN_STROKE_WIDTH = 2.0
_MIN_DELTA_HEIGHT = 22.0
_COORD_RE = re.compile(r"(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)")


def _primary_plot_paths(paths: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [row for row in paths if str(row.get("role") or "") != "shadow"]


def _path_bbox(d: str) -> tuple[float, float, float, float] | None:
    pairs = _COORD_RE.findall(d)
    if not pairs:
        return None
    xs = [float(x) for x, _y in pairs]
    ys = [float(y) for _x, y in pairs]
    return min(xs), min(ys), max(xs), max(ys)


def _is_grille_stroke_path(row: dict[str, Any]) -> bool:
    fill = str(row.get("fill") or "none").strip().lower()
    if fill not in {"", "none"}:
        return False
    d = str(row.get("d") or "")
    if d.count("M") < 2:
        return False
    return all(" L" in segment for segment in d.split("M")[1:] if segment.strip())


def load_plot_fixture(path: Path | str) -> dict[str, Any]:
    raw = json.loads(Path(path).read_text(encoding="utf-8"))
    if not isinstance(raw, dict):
        raise ValueError("plot fixture must be a JSON object")
    graph = raw.get("procedural_graph")
    if not isinstance(graph, dict):
        raise ValueError("plot fixture missing procedural_graph")
    return raw


def verify_plot_heuristics(fixture: dict[str, Any]) -> list[str]:
    """Plot-specific checks beyond hero metrics (subject misread prevention)."""
    errors: list[str] = []
    graph = fixture.get("procedural_graph")
    if not isinstance(graph, dict):
        return ["procedural_graph missing"]
    if graph.get("envelope_id"):
        errors.append("plot fixture must not carry envelope_id (authored grid only)")
    paths = list(graph.get("paths") or [])
    primary = _primary_plot_paths(paths)
    if len(primary) != _COMBADGE_PRIMARY_PATH_COUNT:
        errors.append(
            f"combadge plot fixture requires {_COMBADGE_PRIMARY_PATH_COUNT} primary paths "
            f"(backing + delta), got {len(primary)}"
        )
    roles = {str(row.get("role") or "") for row in primary}
    if "mass" not in roles:
        errors.append("combadge plot fixture missing delta mass path")
    if "accent" not in roles:
        errors.append("combadge plot fixture missing backing accent path")
    delta_rows = [row for row in primary if str(row.get("role") or "") == "mass"]
    backing_rows = [row for row in primary if str(row.get("role") or "") == "accent"]
    for row in primary:
        role = str(row.get("role") or "")
        if role in _EMBLEM_GRAMMAR_ROLES:
            errors.append(f"emblem grammar role forbidden in proof fixture: role={role}")
        if _is_grille_stroke_path(row):
            errors.append("grille stroke path forbidden — use integrated prop paths only")
        fill = str(row.get("fill") or "none").strip().lower()
        if fill not in {"", "none", "currentcolor"}:
            errors.append(f"plot fixture paths must use fill none or currentColor, got {fill}")
        sw = float(row.get("stroke_width", 0))
        if sw < _MIN_STROKE_WIDTH:
            errors.append(f"stroke_width below proof floor ({sw} < {_MIN_STROKE_WIDTH})")
        d = str(row.get("d") or "")
        if role == "mass" and " C" not in d and " Q" not in d and " S" not in d:
            errors.append("delta path must use curved silhouette (not flat polygon)")
    if delta_rows:
        delta_box = _path_bbox(str(delta_rows[0].get("d") or ""))
        if delta_box:
            height = delta_box[3] - delta_box[1]
            if height < _MIN_DELTA_HEIGHT:
                errors.append(f"delta silhouette too short for combadge read ({height:.1f}dp)")
    if delta_rows and backing_rows:
        delta_box = _path_bbox(str(delta_rows[0].get("d") or ""))
        backing_box = _path_bbox(str(backing_rows[0].get("d") or ""))
        if delta_box and backing_box:
            _dx0, dy0, _dx1, dy1 = delta_box
            _bx0, by0, _bx1, by1 = backing_box
            if dy0 >= by0:
                errors.append("delta must overhang above backing oval (TNG topology)")
            if dy1 <= by1:
                errors.append("delta must overhang below backing oval (TNG topology)")
    composition = graph.get("composition")
    if isinstance(composition, dict):
        schema = str(composition.get("schema") or "")
        if schema == "plot_v1":
            errors.append("plot fixture must not use plot_v1 emblem composition schema")
    phrase = str(fixture.get("subject_phrase") or "").strip()
    if not phrase:
        errors.append("subject_phrase required on plot fixture")
    if fixture.get("proof_mode") is not True:
        errors.append("proof_mode must be true on plot fixture")
    return errors


def verify_plot_fixture_graph(graph: dict[str, Any]) -> list[str]:
    """Authored-graph metrics for plot proof (no envelope normalization)."""
    errors: list[str] = []
    if not is_valid_procedural_graph(graph):
        errors.append("procedural_graph invalid")
        return errors
    if graph.get("envelope_id"):
        errors.append("plot procedural_graph must remain authored (no envelope_id)")

    paths = list(graph.get("paths") or [])
    circles = list(graph.get("circles") or [])
    metrics = measure_glyph_content_metrics(paths, circles)
    longest = max(metrics["width"], metrics["height"])
    if longest < _FOCAL_MIN_EDGE:
        errors.append(f"focal mass below hero optical floor ({longest:.1f}dp < {_FOCAL_MIN_EDGE}dp)")

    tv = project_procedural_graph_for_google_tv(dict(graph))
    if not tv.get("paths"):
        errors.append("TV projection produced empty path list")
    return errors


def verify_plot_fixture(fixture: dict[str, Any]) -> dict[str, Any]:
    graph = fixture["procedural_graph"]
    heuristic_errors = verify_plot_heuristics(fixture)
    metric_errors = verify_plot_fixture_graph(graph)
    paths = list(graph.get("paths") or [])
    circles = list(graph.get("circles") or [])
    metrics = measure_glyph_content_metrics(paths, circles)
    longest = max(metrics["width"], metrics["height"])
    return {
        "valid": not heuristic_errors and not metric_errors,
        "heuristic_errors": heuristic_errors,
        "metric_errors": metric_errors,
        "metrics": metrics,
        "longest_edge_dp": round(longest, 2),
        "tv_path_count": len(project_procedural_graph_for_google_tv(dict(graph)).get("paths") or []),
    }


def _render_graph_paths(paths: list[dict[str, Any]], *, stroke: str = "#22d3ee") -> str:
    rows: list[str] = []
    for row in paths:
        if str(row.get("role") or "") == "shadow":
            continue
        sw = float(row.get("stroke_width", 2.5))
        op = float(row.get("opacity", 1.0))
        fill = str(row.get("fill") or "none")
        if fill.lower() == "currentcolor":
            fill = "none"
        stroke_attr = str(row.get("stroke") or stroke)
        if stroke_attr.lower() == "currentcolor":
            stroke_attr = stroke
        fill_rule = str(row.get("fill_rule") or "").strip()
        d = str(row.get("d") or "")
        rule_attr = f' fill-rule="{fill_rule}"' if fill_rule else ""
        rows.append(
            f'<path d="{d}" stroke="{stroke_attr}" stroke-width="{sw}" fill="{fill}" '
            f'opacity="{op}" stroke-linecap="round" stroke-linejoin="round"{rule_attr}/>'
        )
    return "\n    ".join(rows)


def write_plot_strip(
    fixture: dict[str, Any],
    out_path: Path | str = _PLOT_STRIP_OUT,
) -> Path:
    """Multi-scale SVG strip for operator squint test (48 / 96 / 24 logical px)."""
    graph = dict(fixture["procedural_graph"])
    paths = list(graph.get("paths") or [])
    inner = _render_graph_paths(paths)
    scales = [
        ("48px canonical", 48, 8, 8),
        ("96px delivery", 96, 72, 8),
        ("24px thumbnail", 24, 136, 8),
    ]
    panels: list[str] = []
    for label, size, x, y in scales:
        panels.append(
            f'  <g transform="translate({x},{y})">\n'
            f'    <text x="0" y="-4" fill="#94a3b8" font-family="system-ui,sans-serif" '
            f'font-size="6">{label}</text>\n'
            f'    <rect width="{size}" height="{size}" fill="#0b1220" rx="2"/>\n'
            f'    <svg x="0" y="0" width="{size}" height="{size}" viewBox="0 0 48 48">\n'
            f"    {inner}\n"
            f"    </svg>\n"
            f"  </g>"
        )
    width = 136 + 24 + 8
    svg = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="64" '
        f'viewBox="0 0 {width} 64">\n'
        f'  <title>{fixture.get("plot_id", "plot")} — multi-scale strip</title>\n'
        + "\n".join(panels)
        + "\n</svg>\n"
    )
    dest = Path(out_path)
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(svg, encoding="utf-8")
    return dest


def run_plot_verify(fixture_path: Path | str = _DEFAULT_FIXTURE) -> dict[str, Any]:
    fixture = load_plot_fixture(fixture_path)
    result = verify_plot_fixture(fixture)
    strip = write_plot_strip(fixture)
    result["fixture_path"] = str(fixture_path)
    result["strip_path"] = str(strip)
    return result


def main(argv: list[str] | None = None) -> int:
    import sys

    args = argv if argv is not None else sys.argv[1:]
    path = Path(args[0]) if args else _DEFAULT_FIXTURE
    result = run_plot_verify(path)
    print(json.dumps({k: v for k, v in result.items() if k != "metrics"}, indent=2))
    if not result["valid"]:
        for err in result["heuristic_errors"] + result["metric_errors"]:
            print(f"plot-gate: {err}", file=sys.stderr)
        return 1
    print(f"plot-gate: ok strip={result['strip_path']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

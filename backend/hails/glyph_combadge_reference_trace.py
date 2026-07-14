"""Combadge trace from operator reference photo -> 2-path SVG.

Segments the reference PNG (Pillow) into gold/silver masks, runs a real
Inkscape headless bitmap trace on the silver (delta) mask to recover its
actual silhouette, and fits both paths to the 48x48 plot grid via the
existing authored-SVG normalize pipeline. The gold oval stays a measured
ellipse (the subject genuinely is an ellipse); the delta is real traced
ink, not a hand-tuned template.
"""

from __future__ import annotations

import re
import shutil
import subprocess
import tempfile
import xml.etree.ElementTree as ET
from collections import deque
from pathlib import Path
from typing import Any

from hails.glyph_svg_normalize import SvgNormalizeError, combadge_import_options, normalize_svg_document
from hails.hail_glyph_combadge import combadge_tng_reference_png_path
from hails.hail_glyph_envelope import scale_path_d
from hails.hail_glyph_optical import translate_path_d

_TRACE_TARGET_WIDTH: float = 160.0
_TRACE_CROP_PAD: int = 6
# scans,smooth,stack,remove_background,speckles,smooth_corners,optimize
_OBJECT_TRACE_ARGS = "2,1,0,1,1,0,0"
_PATH_TOKEN_RE = re.compile(r"([MLHVCZmlhvcz])|(-?\d*\.?\d+(?:[eE][-+]?\d+)?)")


class CombadgeTraceError(ValueError):
    """Reference photo could not be traced into combadge roles."""


def _require_pillow():
    try:
        from PIL import Image  # noqa: F401
    except ImportError as exc:
        raise CombadgeTraceError("Pillow required for reference trace") from exc


def _build_gold_mask(img) -> Any:
    """Bronze/gold communicator oval — lower prop region."""
    from PIL import Image

    w, h = img.size
    px = img.load()
    mask = Image.new("L", (w, h), 0)
    mp = mask.load()
    for y in range(h):
        y_norm = y / max(h - 1, 1)
        if y_norm < 0.42:
            continue
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 64:
                continue
            if r < 90 or g < 60 or b > 170 or (r - b) < 25:
                continue
            if r + g > 280 and b < 120:
                mp[x, y] = 255
    return mask


def _build_silver_mask(img) -> Any:
    """Silver delta — upper/mid prop, exclude gold-heavy pixels."""
    from PIL import Image

    w, h = img.size
    px = img.load()
    mask = Image.new("L", (w, h), 0)
    mp = mask.load()
    for y in range(h):
        y_norm = y / max(h - 1, 1)
        if y_norm > 0.92:
            continue
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 64:
                continue
            lum = 0.299 * r + 0.587 * g + 0.114 * b
            spread = max(r, g, b) - min(r, g, b)
            if lum < 120 or spread > 70:
                continue
            if r > 150 and g > 100 and b < 120 and y_norm > 0.55:
                continue
            mp[x, y] = 255
    return mask


def _largest_connected_component(mask) -> Any:
    """Drop speckle/reflection islands — keep only the main silhouette blob."""
    from PIL import Image

    w, h = mask.size
    px = mask.load()
    visited = bytearray(w * h)
    best: list[tuple[int, int]] = []

    for sy in range(h):
        for sx in range(w):
            idx = sy * w + sx
            if visited[idx] or px[sx, sy] == 0:
                continue
            queue = deque([(sx, sy)])
            visited[idx] = 1
            component: list[tuple[int, int]] = []
            while queue:
                x, y = queue.popleft()
                component.append((x, y))
                for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                    if 0 <= nx < w and 0 <= ny < h:
                        nidx = ny * w + nx
                        if not visited[nidx] and px[nx, ny] != 0:
                            visited[nidx] = 1
                            queue.append((nx, ny))
            if len(component) > len(best):
                best = component

    cleaned = Image.new("L", (w, h), 0)
    cp = cleaned.load()
    for x, y in best:
        cp[x, y] = 255
    return cleaned


def _oval_path_from_gold_bbox(gold: tuple[int, int, int, int]) -> str:
    gx0, gy0, gx1, gy1 = gold
    gcx = (gx0 + gx1) / 2
    gcy = (gy0 + gy1) / 2
    rx = (gx1 - gx0) / 2 * 0.94
    ry = (gy1 - gy0) / 2 * 0.90
    return (
        f"M {gcx - rx:.2f} {gcy:.2f} "
        f"C {gcx - rx:.2f} {gcy - ry:.2f} {gcx + rx:.2f} {gcy - ry:.2f} {gcx + rx:.2f} {gcy:.2f} "
        f"C {gcx + rx:.2f} {gcy + ry:.2f} {gcx - rx:.2f} {gcy + ry:.2f} {gcx - rx:.2f} {gcy:.2f} Z"
    )


def _absolutize_path_d(d: str) -> str:
    """Normalize potrace output to absolute M/L/C/Z — no relative or H/V commands."""
    stream: list[tuple[str, Any]] = []
    for letter, num in _PATH_TOKEN_RE.findall(d):
        stream.append(("CMD", letter) if letter else ("NUM", float(num)))

    cx = cy = start_x = start_y = 0.0
    out: list[str] = []
    idx, n = 0, len(stream)
    while idx < n:
        kind, cmd = stream[idx]
        if kind != "CMD":
            raise CombadgeTraceError(f"unexpected path token in traced d: {cmd}")
        idx += 1
        upper = cmd.upper()
        is_rel = cmd.islower()
        if upper == "Z":
            out.append("Z")
            cx, cy = start_x, start_y
            continue
        args: list[float] = []
        while idx < n and stream[idx][0] == "NUM":
            args.append(stream[idx][1])
            idx += 1
        if upper == "M":
            for k in range(0, len(args), 2):
                x, y = args[k], args[k + 1]
                if is_rel:
                    x, y = x + cx, y + cy
                cx, cy = x, y
                if k == 0:
                    start_x, start_y = cx, cy
                out.append(f"{'M' if k == 0 else 'L'} {cx:.3f} {cy:.3f}")
        elif upper == "L":
            for k in range(0, len(args), 2):
                x, y = args[k], args[k + 1]
                if is_rel:
                    x, y = x + cx, y + cy
                cx, cy = x, y
                out.append(f"L {cx:.3f} {cy:.3f}")
        elif upper == "H":
            for x in args:
                cx = x + cx if is_rel else x
                out.append(f"L {cx:.3f} {cy:.3f}")
        elif upper == "V":
            for y in args:
                cy = y + cy if is_rel else y
                out.append(f"L {cx:.3f} {cy:.3f}")
        elif upper == "C":
            for k in range(0, len(args), 6):
                x1, y1, x2, y2, x, y = args[k : k + 6]
                if is_rel:
                    x1, y1, x2, y2, x, y = x1 + cx, y1 + cy, x2 + cx, y2 + cy, x + cx, y + cy
                out.append(f"C {x1:.3f} {y1:.3f} {x2:.3f} {y2:.3f} {x:.3f} {y:.3f}")
                cx, cy = x, y
        else:
            raise CombadgeTraceError(f"unsupported path command for trace import: {cmd}")
    return " ".join(out)


def _run_inkscape_bitmap_trace(png_path: Path, out_svg: Path) -> None:
    if shutil.which("inkscape") is None or shutil.which("xvfb-run") is None:
        raise CombadgeTraceError(
            "real bitmap tracing requires inkscape + xvfb-run installed (apt install inkscape xvfb)"
        )
    actions = (
        "select-all;"
        f"object-trace:{_OBJECT_TRACE_ARGS};"
        "select-all;path-simplify;path-simplify;"
        f"export-filename:{out_svg};export-do"
    )
    result = subprocess.run(
        ["xvfb-run", "-a", "inkscape", str(png_path), f"--actions={actions}"],
        capture_output=True,
        text=True,
        timeout=60,
    )
    if result.returncode != 0 or not out_svg.is_file():
        raise CombadgeTraceError(f"inkscape bitmap trace failed: {result.stderr[-500:]}")


def _lightest_traced_path_d(svg_path: Path) -> str:
    """Potrace emits one path per scan layer — the lightest fill is the real foreground shape."""
    tree = ET.parse(svg_path)
    best_d = ""
    best_luma = -1.0
    for el in tree.iter("{http://www.w3.org/2000/svg}path"):
        d = (el.get("d") or "").strip()
        if not d:
            continue
        match = re.search(r"fill:#([0-9a-fA-F]{6})", el.get("style") or "")
        if match:
            r, g, b = (int(match.group(1)[i : i + 2], 16) for i in (0, 2, 4))
            luma = 0.299 * r + 0.587 * g + 0.114 * b
        else:
            luma = 0.0
        if luma > best_luma:
            best_luma, best_d = luma, d
    if not best_d:
        raise CombadgeTraceError("inkscape trace produced no usable path")
    return best_d


def _trace_mass_path_from_silver_mask(silver_mask) -> str:
    from PIL import Image

    cleaned = _largest_connected_component(silver_mask)
    bbox = cleaned.getbbox()
    if not bbox:
        raise CombadgeTraceError("silver mask has no content after cleanup")
    x0 = max(bbox[0] - _TRACE_CROP_PAD, 0)
    y0 = max(bbox[1] - _TRACE_CROP_PAD, 0)
    x1 = min(bbox[2] + _TRACE_CROP_PAD, cleaned.width)
    y1 = min(bbox[3] + _TRACE_CROP_PAD, cleaned.height)
    crop = cleaned.crop((x0, y0, x1, y1))

    downscale = min(1.0, _TRACE_TARGET_WIDTH / crop.width)
    trace_source = crop
    if downscale < 1.0:
        small_size = (max(1, round(crop.width * downscale)), max(1, round(crop.height * downscale)))
        trace_source = crop.resize(small_size, Image.Resampling.LANCZOS).point(lambda p: 255 if p >= 128 else 0)

    with tempfile.TemporaryDirectory() as tmp:
        mask_png = Path(tmp) / "mass-mask.png"
        traced_svg = Path(tmp) / "mass-traced.svg"
        trace_source.save(mask_png)
        _run_inkscape_bitmap_trace(mask_png, traced_svg)
        traced_d = _lightest_traced_path_d(traced_svg)

    absolute_d = _absolutize_path_d(traced_d)
    native_d = scale_path_d(absolute_d, 0.0, 0.0, 1.0 / downscale)
    return translate_path_d(native_d, float(x0), float(y0))


def trace_combadge_reference_to_svg(reference_png: Path | None = None) -> str:
    """Trace reference PNG into normalized 48x48 combadge SVG (accent + mass)."""
    _require_pillow()
    from PIL import Image

    png = reference_png or combadge_tng_reference_png_path()
    if not png.is_file():
        raise CombadgeTraceError(f"reference PNG missing: {png}")

    img = Image.open(png).convert("RGBA")
    gold_bbox = _build_gold_mask(img).getbbox()
    silver_mask = _build_silver_mask(img)
    if not gold_bbox or not silver_mask.getbbox():
        raise CombadgeTraceError("could not segment gold oval and silver delta from reference")

    accent_d = _oval_path_from_gold_bbox(gold_bbox)
    mass_d = _trace_mass_path_from_silver_mask(silver_mask)

    raw_svg = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {img.width} {img.height}" fill="none">\n'
        f'  <path data-combadge-role="accent" fill="currentColor" fill-opacity="0.72" '
        f'stroke="currentColor" stroke-width="2.2" d="{accent_d}"/>\n'
        f'  <path data-combadge-role="mass" fill="currentColor" stroke="currentColor" '
        f'stroke-width="2.4" d="{mass_d}"/>\n'
        "</svg>\n"
    )
    opts = combadge_import_options()
    try:
        return normalize_svg_document(raw_svg, **opts)
    except SvgNormalizeError as exc:
        raise CombadgeTraceError(str(exc)) from exc


def retrace_combadge_plot_from_reference() -> dict[str, Any]:
    """Trace reference photo, write traced SVG, regenerate plot fixture."""
    from hails.glyph_plot_import import import_authored_svg_for_recipe
    from hails.hail_glyph_combadge import COMBADGE_DELTA_V1

    svg = trace_combadge_reference_to_svg()
    return import_authored_svg_for_recipe(COMBADGE_DELTA_V1, svg, normalize=False)

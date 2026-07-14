"""LCARD catalog projection helpers (Beta B4)."""

from __future__ import annotations

import hashlib
import json
from typing import Any
from xml.sax.saxutils import escape

from hails.glyph_registry import load_glyph_registry

_CATALOG_SCHEMA_VERSION = 2


def chip_glyph_thumb_path(hail_id: str) -> str:
    hid = (hail_id or "").strip()
    return f"/api/hails/{hid}/chip-glyph-thumb"


def absolutize_public_url(path_or_url: str, public_base_url: str) -> str:
    value = (path_or_url or "").strip()
    if not value:
        return ""
    if value.startswith("http://") or value.startswith("https://"):
        return value
    base = (public_base_url or "").rstrip("/")
    if not base:
        return value
    if not value.startswith("/"):
        value = "/" + value
    return base + value


def _glyph_chip_label(glyph_id: str) -> str:
    registry = load_glyph_registry()
    entries = registry.get("entries") if isinstance(registry.get("entries"), dict) else {}
    entry = entries.get(glyph_id) if isinstance(entries, dict) else None
    if isinstance(entry, dict):
        emoji = entry.get("fallback_emoji")
        if isinstance(emoji, str) and emoji.strip():
            return emoji.strip()
        label = entry.get("label")
        if isinstance(label, str) and label.strip():
            return label.strip()[:1].upper()
    return "✦"


_REGISTRY_CHIP_GLYPH_INNER: dict[str, str] = {
    "hail-summons": (
        '<path d="M24 12 L34 36 H14 Z" stroke="#e2f3f7" stroke-width="2.25" stroke-linejoin="round" fill="none"/>'
        '<path d="M24 18v12" stroke="#38bdf8" stroke-width="2" stroke-linecap="round"/>'
    ),
    "default": (
        '<circle cx="24" cy="24" r="14" stroke="#e2f3f7" stroke-width="2"/>'
        '<path d="M24 16v16M16 24h16" stroke="#e2f3f7" stroke-width="2" stroke-linecap="round"/>'
    ),
}


def _xml_attr(value: object) -> str:
    return escape(str(value))


def _procedural_graph_inner_svg(graph: dict[str, Any] | None) -> str | None:
    if not isinstance(graph, dict) or graph.get("version") != 1:
        return None
    paths = graph.get("paths")
    if not isinstance(paths, list) or not paths:
        return None
    parts: list[str] = []
    for path in paths:
        if not isinstance(path, dict) or not isinstance(path.get("d"), str):
            continue
        stroke_linejoin = path.get("stroke_linejoin")
        linejoin_attr = (
            f' stroke-linejoin="{_xml_attr(stroke_linejoin)}"' if stroke_linejoin else ""
        )
        parts.append(
            f'<path d="{_xml_attr(path["d"])}" stroke="{_xml_attr(path.get("stroke") or "#e2f3f7")}" '
            f'stroke-width="{_xml_attr(path.get("stroke_width", 2.5))}" fill="{_xml_attr(path.get("fill") or "none")}" '
            f'opacity="{_xml_attr(path.get("opacity", 1))}" stroke-linecap="{_xml_attr(path.get("stroke_linecap") or "round")}"'
            f"{linejoin_attr}/>"
        )
    for circle in graph.get("circles") or []:
        if not isinstance(circle, dict):
            continue
        parts.append(
            f'<circle cx="{_xml_attr(circle.get("cx", 24))}" cy="{_xml_attr(circle.get("cy", 24))}" '
            f'r="{_xml_attr(circle.get("r", 2))}" fill="{_xml_attr(circle.get("fill") or "#e2f3f7")}" '
            f'opacity="{_xml_attr(circle.get("opacity", 0.9))}"/>'
        )
    return "".join(parts) if parts else None


def _registry_glyph_inner_svg(glyph_id: str) -> str | None:
    inner = _REGISTRY_CHIP_GLYPH_INNER.get(glyph_id or "")
    if inner:
        return inner
    if glyph_id and glyph_id != "default":
        return _REGISTRY_CHIP_GLYPH_INNER.get("default")
    return _REGISTRY_CHIP_GLYPH_INNER["default"]


def render_chip_glyph_thumb_svg(
    *,
    glyph_id: str,
    hail_name: str = "",
    procedural_graph: dict[str, Any] | None = None,
) -> str:
    """Small SVG chip thumb pre-rendered at Save (registry vector mark or procedural graph)."""
    title = escape((hail_name or glyph_id or "Hail").strip() or "Hail")
    inner = _procedural_graph_inner_svg(procedural_graph) or _registry_glyph_inner_svg(glyph_id)
    if not inner:
        mark_xml = escape(_glyph_chip_label(glyph_id or "default"))
        inner = (
            f'<text x="48" y="56" text-anchor="middle" font-size="40" fill="#e2f3f7" '
            f'font-family="system-ui, sans-serif">{mark_xml}</text>'
        )
        glyph_layer = inner
    else:
        glyph_layer = (
            f'<svg x="24" y="24" width="48" height="48" viewBox="0 0 48 48" aria-hidden="true">{inner}</svg>'
        )
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96" role="img" aria-label="{title}">
  <rect width="96" height="96" rx="20" fill="#0f172a"/>
  <circle cx="48" cy="48" r="34" fill="#164e63" opacity="0.55"/>
  {glyph_layer}
</svg>"""


def compute_hails_catalog_revision(hails: list[dict[str, Any]]) -> str:
    parts: list[str] = []
    for hail in sorted(hails, key=lambda item: str(item.get("id") or "")):
        hail_id = str(hail.get("id") or "")
        pkg = hail.get("hail_package") if isinstance(hail.get("hail_package"), dict) else {}
        parts.append(
            json.dumps(
                {
                    "id": hail_id,
                    "enabled": hail.get("enabled") is not False,
                    "archived": hail.get("archived") is True,
                    "package_version": pkg.get("package_version"),
                    "fingerprint": pkg.get("components_fingerprint"),
                    "catalog_ready": pkg.get("catalog_ready") is True,
                },
                sort_keys=True,
                separators=(",", ":"),
            )
        )
    digest = hashlib.sha256("|".join(parts).encode("utf-8")).hexdigest()
    return digest[:16]


def stamp_lcard_catalog_fields(
    hail_record: dict[str, Any],
    *,
    package_version: int,
) -> dict[str, str | int]:
    hail_id = str(hail_record.get("id") or "").strip()
    return {
        "catalog_schema_version": _CATALOG_SCHEMA_VERSION,
        "catalog_revision": int(package_version),
        "chip_glyph_thumb_url": chip_glyph_thumb_path(hail_id),
    }


def project_lcard_catalog_fields(
    hail: dict[str, Any],
    *,
    public_base_url: str = "",
) -> dict[str, Any]:
    """Top-level LCARD catalog projection fields on effective hail rows."""
    out: dict[str, Any] = {}
    message = hail.get("message") if isinstance(hail.get("message"), dict) else {}
    short_text = message.get("short_text") if isinstance(message.get("short_text"), str) else ""
    if short_text.strip():
        out["message_preview"] = short_text.strip()

    pkg = hail.get("hail_package") if isinstance(hail.get("hail_package"), dict) else {}
    thumb = pkg.get("chip_glyph_thumb_url") or chip_glyph_thumb_path(str(hail.get("id") or ""))
    out["chip_glyph_thumb_url"] = absolutize_public_url(str(thumb), public_base_url)
    if pkg.get("catalog_revision") is not None:
        out["catalog_revision"] = pkg.get("catalog_revision")
    if pkg.get("catalog_schema_version") is not None:
        out["catalog_schema_version"] = pkg.get("catalog_schema_version")
    return out

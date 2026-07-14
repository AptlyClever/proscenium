"""Google TV glyph render projection — consumer payload ``glyph_render`` block.

Paintbox previews and APK delivery must use this projection, not parallel glyph paths.
See docs/hails/hails-render-parity-v002.md and tv-glyph-parity-tiered-delivery-v001.md.
"""

from __future__ import annotations

import base64
from typing import Any, Final

from hails.hail_glyph_image_asset import (
    media_type_for_image_path,
    normalize_image_layers,
    resolve_glyph_image_path,
    validate_image_layers,
)
from hails.hail_glyph_procedural import is_valid_procedural_graph
from hails.hail_glyph_tv_projection import (
    CONSUMER_AXIOM_AUTHORING,
    CONSUMER_GOOGLE_TV_APK,
    normalize_consumer_id,
    projection_metadata,
    project_procedural_graph_for_google_tv,
)

GOOGLE_TV_REGISTRY_GLYPH_IDS: Final[frozenset[str]] = frozenset(
    {
        "hail-summons",
        "hail-alert",
        "hail-route",
        "hail-beacon",
        "default",
    }
)

GOOGLE_TV_RENDER_TARGET: Final[dict[str, Any]] = {
    "surface": "google_tv",
    "contract": "google_tv_v1",
    "rooms": ["arcade", "master_bedroom", "away_team"],
}


def _encode_image_layer(layer: dict[str, Any], glyph_id: str, consumer: str) -> dict[str, Any]:
    path = str(layer.get("path") or "").strip()
    row: dict[str, Any] = {
        "role": str(layer.get("role") or "mass"),
        "path": path,
    }
    if "z_index" in layer:
        row["z_index"] = layer["z_index"]
    if layer.get("pulse_anchor"):
        row["pulse_anchor"] = layer["pulse_anchor"]
    if consumer == CONSUMER_GOOGLE_TV_APK:
        resolved = resolve_glyph_image_path(path)
        row["image_base64"] = base64.b64encode(resolved.read_bytes()).decode("ascii")
        row["image_media_type"] = media_type_for_image_path(resolved)
    else:
        row["image_url"] = f"/api/hails/glyph-hero-images/{path.lstrip('/')}"
    return row


def _resolve_image_layers_glyph_render(glyph_id: str, spec: dict[str, Any], consumer: str) -> dict[str, Any] | None:
    if spec.get("representation_kind") != "image":
        return None
    layers = normalize_image_layers(spec.get("image_layers"))
    if len(layers) < 2:
        return None
    if validate_image_layers(layers):
        return None
    return {
        "kind": "image_layers",
        "glyph_id": glyph_id,
        "google_tv_deliverable": True,
        "representation": "canonical",
        "layers": [_encode_image_layer(layer, glyph_id, consumer) for layer in layers],
    }


def _resolve_image_glyph_render(glyph_id: str, spec: dict[str, Any], consumer: str) -> dict[str, Any] | None:
    """Flat raster Glyph Hero — same pixels everywhere, no per-consumer projection."""
    if spec.get("representation_kind") != "image":
        return None
    image_asset = spec.get("image_asset") if isinstance(spec.get("image_asset"), dict) else {}
    asset_path = str(image_asset.get("path") or "").strip()
    if not asset_path:
        return None
    render: dict[str, Any] = {
        "kind": "image",
        "glyph_id": glyph_id,
        "google_tv_deliverable": True,
        "representation": "canonical",
    }
    if consumer == CONSUMER_GOOGLE_TV_APK:
        try:
            resolved_path = resolve_glyph_image_path(asset_path)
        except FileNotFoundError:
            return None
        render["image_base64"] = base64.b64encode(resolved_path.read_bytes()).decode("ascii")
        render["image_media_type"] = media_type_for_image_path(resolved_path)
    else:
        render["image_url"] = f"/api/hails/glyph-images/{glyph_id}.png"
    return render


def resolve_glyph_render(
    glyph_id: str | None,
    *,
    custom_glyphs: dict[str, dict[str, Any]] | None = None,
    consumer_id: str | None = None,
) -> dict[str, Any]:
    """Project glyph identity into a consumer-specific render block."""
    raw = (glyph_id or "").strip() or "default"
    library = custom_glyphs or {}
    consumer = normalize_consumer_id(consumer_id)

    if raw.startswith("custom-"):
        spec = library.get(raw) if isinstance(library.get(raw), dict) else {}
        layered = _resolve_image_layers_glyph_render(raw, spec, consumer)
        if layered is not None:
            return layered
        image_render = _resolve_image_glyph_render(raw, spec, consumer)
        if image_render is not None:
            return image_render
        graph = spec.get("procedural_graph")
        if is_valid_procedural_graph(graph):
            assert isinstance(graph, dict)
            if consumer == CONSUMER_AXIOM_AUTHORING:
                return {
                    "kind": "procedural",
                    "glyph_id": raw,
                    "procedural_graph": graph,
                    "google_tv_deliverable": True,
                    "representation": "canonical",
                }
            projected = project_procedural_graph_for_google_tv(graph)
            meta = projection_metadata(graph, projected)
            return {
                "kind": "procedural",
                "glyph_id": raw,
                "procedural_graph": projected,
                "google_tv_deliverable": True,
                "representation": "projected",
                **meta,
            }
        fallback = (spec.get("fallback_emoji") or "✦").strip() or "✦"
        return {
            "kind": "emoji_fallback",
            "glyph_id": raw,
            "fallback": fallback,
            "google_tv_deliverable": False,
        }

    if raw in GOOGLE_TV_REGISTRY_GLYPH_IDS:
        return {
            "kind": "registry",
            "glyph_id": raw,
            "google_tv_deliverable": True,
        }

    return {
        "kind": "registry",
        "glyph_id": "default",
        "requested_glyph_id": raw,
        "google_tv_deliverable": raw == "default",
    }


def is_google_tv_glyph_deliverable(glyph_render: dict[str, Any] | None) -> bool:
    if not isinstance(glyph_render, dict):
        return False
    return glyph_render.get("google_tv_deliverable") is True

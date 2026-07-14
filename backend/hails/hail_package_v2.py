"""Hail Package v2 — compose metadata, layout regions, delivery envelope enrichment."""

from __future__ import annotations

import copy
import hashlib
import json
from datetime import datetime, timezone
from typing import Any

from hails.hail_display_class import (
    display_class_for_delivery_target,
    resolve_display_class_for_hail,
)
from hails.hail_glyph_art_layout import attach_glyph_art_to_layout_regions
from hails.hail_lcard_catalog import stamp_lcard_catalog_fields
from hails.hail_effect_field_layout import resolve_effect_footprint_profile
from hails.hail_paintbox_layout import resolve_hail_package_layout
from hails.hails_consumer_capability import (
    MANIFEST_ID,
    PACKAGE_SCHEMA_VERSION,
    load_consumer_capability_manifest,
    validate_hail_package_for_consumers,
)
from hails.hails_glyph_render import is_google_tv_glyph_deliverable
from hails.hails_message_sidekick import (
    build_message_entity,
    resolve_effective_message_tuning,
    resolve_message_sidekick_identity,
)
from hails.hails_package_accent_wash import apply_package_accent_wash_to_presentation
from hails.hails_palette_presentation import resolve_delivery_palette_for_overlay, resolve_palette_presentation
from hails.hails_presentation_registry import (
    apply_entrance_presence_to_android_tuning,
    apply_presentation_modifiers,
    build_presentation_entity,
)
from hails.hails_priority import normalize_priority_level
from hails.hails_render_contract import load_hail_render_contract, load_hail_render_contract_for_generation, normalize_named_effect_id

OVERLAY_EFFECT_ALIASES = {
    "transporter": "transporter_beam",
    "transporter_beam": "transporter_beam",
    "pop": "pop",
}


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def components_fingerprint(
    payload: dict[str, Any],
    *,
    custom_glyphs: dict[str, dict[str, Any]] | None = None,
) -> str:
    parts = {
        "glyph_id": payload.get("glyph_id"),
        "effect_id": payload.get("effect_id"),
        "effect_variation_id": payload.get("effect_variation_id"),
        "message_sidekick_id": payload.get("message_sidekick_id"),
        "palette_id": payload.get("palette_id"),
        "placement_id": payload.get("placement_id"),
        "size_tier": payload.get("size_tier"),
    }
    glyph_id = str(payload.get("glyph_id") or "").strip()
    content_digest = _glyph_content_digest(glyph_id, custom_glyphs)
    if content_digest:
        parts["glyph_content_digest"] = content_digest
    digest = hashlib.sha256(json.dumps(parts, sort_keys=True).encode("utf-8")).hexdigest()
    return digest[:16]


def _glyph_content_digest(
    glyph_id: str,
    custom_glyphs: dict[str, dict[str, Any]] | None,
) -> str | None:
    raw = (glyph_id or "").strip()
    if not raw.startswith("custom-"):
        return None
    spec = (custom_glyphs or {}).get(raw)
    if not isinstance(spec, dict):
        return None
    body = {
        "procedural_graph": spec.get("procedural_graph"),
        "visual": spec.get("visual"),
        "animation_enabled": spec.get("animation_enabled"),
        "updated_at": spec.get("updated_at"),
    }
    digest = hashlib.sha256(json.dumps(body, sort_keys=True, default=str).encode("utf-8")).hexdigest()
    return digest[:16]


def live_components_fingerprint_for_hail(
    hail_record: dict[str, Any],
    *,
    custom_glyphs: dict[str, dict[str, Any]] | None = None,
) -> str | None:
    if hail_record.get("archived") is True:
        return None
    from hails.hails_render_contract import build_consumer_render_payload

    payload = build_consumer_render_payload(hail_record, custom_glyphs=custom_glyphs)
    return components_fingerprint(payload, custom_glyphs=custom_glyphs)


def hail_has_stale_components(
    hail_record: dict[str, Any],
    *,
    custom_glyphs: dict[str, dict[str, Any]] | None = None,
) -> bool:
    pkg = hail_record.get("hail_package")
    if not isinstance(pkg, dict):
        return False
    saved = pkg.get("components_fingerprint")
    if not isinstance(saved, str) or not saved.strip():
        return False
    live = live_components_fingerprint_for_hail(hail_record, custom_glyphs=custom_glyphs)
    if not live:
        return False
    return saved != live


def project_hail_stale_components(
    hail_record: dict[str, Any],
    *,
    custom_glyphs: dict[str, dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """Attach top-level stale_components when live Forge state diverges from saved package."""
    out = copy.deepcopy(hail_record)
    if hail_has_stale_components(hail_record, custom_glyphs=custom_glyphs):
        out["stale_components"] = True
        pkg = hail_record.get("hail_package")
        if isinstance(pkg, dict):
            out["stale_components_detail"] = {
                "saved_fingerprint": pkg.get("components_fingerprint"),
                "live_fingerprint": live_components_fingerprint_for_hail(
                    hail_record,
                    custom_glyphs=custom_glyphs,
                ),
                "reason": "forge_or_visual_drift",
            }
    else:
        out.pop("stale_components", None)
        out.pop("stale_components_detail", None)
    return out


def enrich_consumer_render_payload_v2(
    base_payload: dict[str, Any],
    hail_record: dict[str, Any],
    *,
    contract: dict[str, Any] | None = None,
    manifest: dict[str, Any] | None = None,
    custom_glyphs: dict[str, dict[str, Any]] | None = None,
) -> dict[str, Any]:
    doc = contract or load_hail_render_contract_for_generation("v002-beta")
    manifest_doc = manifest or load_consumer_capability_manifest()
    payload = copy.deepcopy(base_payload)

    visual = hail_record.get("visual") if isinstance(hail_record.get("visual"), dict) else {}
    stable_hold_ms = payload.get("duration_ms")
    if stable_hold_ms is not None:
        try:
            stable_hold_ms = int(stable_hold_ms)
        except (TypeError, ValueError):
            stable_hold_ms = None

    message_entity = build_message_entity(
        hail_record,
        contract=doc,
        stable_hold_ms=stable_hold_ms,
    )
    message_sidekick_id = message_entity.get("sidekick_id")
    message_tuning = resolve_effective_message_tuning(visual, str(message_sidekick_id or ""), contract=doc)
    message_identity = resolve_message_sidekick_identity(
        str(message_sidekick_id or ""),
        message_tuning,
        contract=doc,
    )
    effect_id = normalize_named_effect_id(
        str(payload.get("effect_id") or visual.get("effect_id") or "transporter")
    )
    effect_footprint_profile = resolve_effect_footprint_profile(visual.get("effect_footprint_profile"))
    effect_tuning = visual.get("effect_tuning") if isinstance(visual.get("effect_tuning"), dict) else {}
    raw_footprint_scale = effect_tuning.get("footprint_scale")
    footprint_scale = float(raw_footprint_scale) if isinstance(raw_footprint_scale, (int, float)) else 1.0
    priority_level = normalize_priority_level(visual.get("priority_level"))
    display_class = resolve_display_class_for_hail(hail_record, visual)
    layout = resolve_hail_package_layout(
        placement_id=str(payload.get("placement_id") or "upper_center"),
        placement_mode=str(payload.get("placement_mode") or "preset"),
        size_tier=str(payload.get("size_tier") or "medium"),
        contract=doc,
        x_percent=payload.get("x_percent"),
        y_percent=payload.get("y_percent"),
        effect_id=effect_id,
        effect_footprint_profile=effect_footprint_profile,
        footprint_scale=footprint_scale,
        display_class=display_class,
        priority_level=priority_level,
    )

    payload["package_schema_version"] = PACKAGE_SCHEMA_VERSION
    payload["layout_contract_version"] = manifest_doc.get("layout_contract_version") or doc.get("version")
    payload["consumer_manifest_id"] = manifest_doc.get("manifest_id", MANIFEST_ID)
    payload["display_class"] = display_class
    payload["message_entity"] = message_entity
    payload["message"] = message_entity["text"]
    payload["message_sidekick_id"] = message_sidekick_id
    payload["message_identity"] = message_identity
    payload["message_tuning"] = message_tuning
    payload["reference_viewport"] = layout["reference_viewport"]
    payload["paint_box_screen"] = layout["paint_box_screen"]
    payload["layout_regions"] = attach_glyph_art_to_layout_regions(
        layout["layout_regions"],
        payload.get("glyph_render") if isinstance(payload.get("glyph_render"), dict) else None,
    )
    payload["components_fingerprint"] = components_fingerprint(payload, custom_glyphs=custom_glyphs)
    presentation_entity = build_presentation_entity(hail_record, contract=doc)
    base_presentation = resolve_palette_presentation(
        payload.get("palette_id"),
        contract=doc,
    )
    payload["priority_level"] = priority_level
    payload["presentation_entity"] = presentation_entity
    merged_presentation = apply_presentation_modifiers(
        base_presentation,
        presentation_entity.get("modifiers") if isinstance(presentation_entity.get("modifiers"), dict) else {},
    )
    payload["palette_presentation"] = apply_package_accent_wash_to_presentation(
        merged_presentation,
        visual,
    )
    entrance_scale = float(payload["palette_presentation"].get("entrance_presence_scale") or 1.0)
    payload["android_effect_tuning"] = apply_entrance_presence_to_android_tuning(
        payload.get("android_effect_tuning"),
        entrance_scale,
    )
    from hails.hails_stable_interest import resolve_stable_interest

    stable_interest = resolve_stable_interest(
        effect_id=effect_id,
        variation_id=str(payload.get("effect_variation_id") or visual.get("effect_variation_id") or "") or None,
        priority_level=priority_level,
        contract=doc,
    )
    if stable_interest is not None:
        payload["stable_interest"] = stable_interest

    from hails.hail_presentation_template import build_presentation_template_entity

    presentation_template = build_presentation_template_entity(hail_record)
    if presentation_template is not None:
        payload["presentation_template"] = presentation_template
        overlay = presentation_template.get("presentation_overlay")
        if isinstance(overlay, dict):
            payload["presentation_overlay"] = overlay

    validation_errors = validate_hail_package_for_consumers(payload, manifest=manifest_doc)
    payload["catalog_ready"] = len(validation_errors) == 0
    if validation_errors:
        payload["consumer_validation_errors"] = validation_errors

    return payload


def stamp_hail_package_metadata(
    hail_record: dict[str, Any],
    payload: dict[str, Any],
    *,
    previous: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Persist package metadata on hail record at Save."""
    out = copy.deepcopy(hail_record)
    prev_pkg = {}
    if isinstance(previous, dict):
        prev_block = previous.get("hail_package")
        if isinstance(prev_block, dict):
            prev_pkg = prev_block

    prev_fingerprint = prev_pkg.get("components_fingerprint")
    next_fingerprint = payload.get("components_fingerprint")
    package_version = int(prev_pkg.get("package_version") or 0)
    if prev_fingerprint != next_fingerprint:
        package_version += 1
    if package_version < 1:
        package_version = 1

    out["hail_package"] = {
        "package_schema_version": PACKAGE_SCHEMA_VERSION,
        "package_version": package_version,
        "layout_contract_version": payload.get("layout_contract_version"),
        "components_fingerprint": next_fingerprint,
        "consumer_manifest_id": payload.get("consumer_manifest_id"),
        "catalog_ready": payload.get("catalog_ready") is True,
        "saved_at": _utc_now_iso(),
        **stamp_lcard_catalog_fields(
            out,
            package_version=package_version,
        ),
    }
    return out


def validate_hail_record_for_save(
    hail_record: dict[str, Any],
    payload: dict[str, Any],
    *,
    manifest: dict[str, Any] | None = None,
) -> list[dict[str, str]]:
    errors = list(validate_hail_package_for_consumers(payload, manifest=manifest))
    if hail_record.get("enabled") is False:
        return errors
    if hail_record.get("archived") is True:
        return errors
    glyph_render = payload.get("glyph_render")
    if isinstance(glyph_render, dict) and glyph_render.get("kind") == "emoji_fallback":
        errors.append(
            {
                "path": "/icon/value",
                "message": "emoji fallback glyphs cannot be saved for TV delivery",
            }
        )
    if not is_google_tv_glyph_deliverable(glyph_render if isinstance(glyph_render, dict) else None):
        if not any(e.get("path") == "/glyph_render" for e in errors):
            errors.append(
                {
                    "path": "/glyph_render",
                    "message": "glyph must be Google TV deliverable (registry or procedural)",
                }
            )
    return errors


def map_axiom_effect_to_overlay_effect(effect_id: str) -> str:
    raw = (effect_id or "").strip()
    mapped = OVERLAY_EFFECT_ALIASES.get(raw)
    if not mapped:
        raise ValueError(f"effect_id {raw!r} is not mapped for overlay delivery")
    return mapped


def recompose_package_layout_for_delivery(
    payload: dict[str, Any],
    *,
    delivery_target_id: str | None = None,
    contract: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Re-resolve frozen layout for the destination display class (WYSIWYG send path)."""
    from hails.hails_render_contract import load_hail_render_contract_for_generation

    doc = contract or load_hail_render_contract_for_generation("v002-beta")
    out = copy.deepcopy(payload)
    display_class = display_class_for_delivery_target(delivery_target_id)
    priority_level = normalize_priority_level(out.get("priority_level"))
    effect_footprint_profile = "standard"
    frozen_effect = out.get("layout_regions", {}).get("effect_field") if isinstance(out.get("layout_regions"), dict) else None
    if isinstance(frozen_effect, dict) and frozen_effect.get("effect_footprint_profile"):
        effect_footprint_profile = str(frozen_effect["effect_footprint_profile"])
    layout = resolve_hail_package_layout(
        placement_id=str(out.get("placement_id") or "upper_center"),
        placement_mode=str(out.get("placement_mode") or "preset"),
        size_tier=str(out.get("size_tier") or "medium"),
        contract=doc,
        x_percent=out.get("x_percent"),
        y_percent=out.get("y_percent"),
        effect_id=str(out.get("effect_id") or "transporter"),
        effect_footprint_profile=effect_footprint_profile,
        display_class=display_class,
        priority_level=priority_level,
    )
    out["display_class"] = display_class
    out["reference_viewport"] = layout["reference_viewport"]
    out["paint_box_screen"] = layout["paint_box_screen"]
    out["layout_regions"] = attach_glyph_art_to_layout_regions(
        layout["layout_regions"],
        out.get("glyph_render") if isinstance(out.get("glyph_render"), dict) else None,
    )
    return out


def build_delivery_envelope(payload: dict[str, Any]) -> dict[str, Any]:
    """Overlay POST body + v2 package fields for APK (Axiom-owned send path)."""
    effect_id = map_axiom_effect_to_overlay_effect(str(payload.get("effect_id") or ""))
    message_entity = payload.get("message_entity")
    message_text = payload.get("message") or ""
    if isinstance(message_entity, dict):
        message_text = message_entity.get("text", message_text)

    duration_ms = payload.get("duration_ms")
    try:
        resolved_duration = int(duration_ms) if duration_ms is not None else 5500
    except (TypeError, ValueError):
        resolved_duration = 5500
    if resolved_duration < 1000:
        resolved_duration = 1000
    if resolved_duration > 30000:
        resolved_duration = 30000

    overlay = {
        "hail_id": payload.get("hail_id"),
        "effect_id": effect_id,
        "glyph_id": payload.get("glyph_id") or "default",
        "palette_id": resolve_delivery_palette_for_overlay(
            str(payload.get("palette_id") or "axiom_dark_cyan"),
            str(payload.get("effect_variation_id") or "").strip() or None,
        ),
        "message": str(message_text or ""),
        "duration_ms": resolved_duration,
        "placement_id": payload.get("placement_id") or "upper_center",
        "placement_mode": payload.get("placement_mode") or "preset",
        "size_tier": payload.get("size_tier") or "medium",
        "package_schema_version": payload.get("package_schema_version"),
        "layout_regions": payload.get("layout_regions"),
        "paint_box_screen": payload.get("paint_box_screen"),
        "reference_viewport": payload.get("reference_viewport"),
        "message_entity": payload.get("message_entity"),
        "message_sidekick_id": payload.get("message_sidekick_id"),
        "message_identity": payload.get("message_identity"),
        "message_tuning": payload.get("message_tuning"),
        "glyph_render": payload.get("glyph_render"),
        "lifecycle_timing": payload.get("lifecycle_timing"),
        "effect_identity": payload.get("effect_identity"),
        "effect_variation_id": payload.get("effect_variation_id"),
        "android_effect_tuning": payload.get("android_effect_tuning"),
        "palette_presentation": payload.get("palette_presentation"),
        "priority_level": payload.get("priority_level"),
        "presentation_entity": payload.get("presentation_entity"),
    }
    if payload.get("placement_mode") == "custom":
        overlay["x_percent"] = payload.get("x_percent")
        overlay["y_percent"] = payload.get("y_percent")

    from hails.hail_presentation_template import (
        build_presentation_template_for_delivery,
        merge_effect_identity_with_template_choreography,
    )

    delivery_template = build_presentation_template_for_delivery(payload.get("presentation_template"))
    if delivery_template is not None:
        overlay["presentation_template"] = delivery_template
        merged_identity = merge_effect_identity_with_template_choreography(
            overlay.get("effect_identity") if isinstance(overlay.get("effect_identity"), dict) else None,
            delivery_template,
            effect_id=effect_id,
        )
        if merged_identity is not None:
            overlay["effect_identity"] = merged_identity

    lifecycle = overlay.get("lifecycle_timing")
    if isinstance(lifecycle, dict):
        lifecycle = dict(lifecycle)
        lifecycle["stable_hold_ms"] = resolved_duration
        entrance = int(lifecycle.get("entrance_animation_ms") or 0)
        exit_ms = int(lifecycle.get("exit_animation_ms") or 0)
        lifecycle["total_timed_lifecycle_ms"] = entrance + resolved_duration + exit_ms
        overlay["lifecycle_timing"] = lifecycle

    return {
        "overlay": overlay,
        "source": "axiom-hail-package-v2",
        "package_schema_version": payload.get("package_schema_version"),
    }

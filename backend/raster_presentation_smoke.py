"""Offline + live smoke helpers for raster presentation pivot exit gate."""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from hails.hail_package_v2 import build_delivery_envelope, enrich_consumer_render_payload_v2
from hails.hails_render_contract import build_consumer_render_payload
from settings import _resolve_repo_root


@dataclass(frozen=True)
class RasterDemoCase:
    hail_id: str
    fixture_path: str
    exemplar_path: str
    overlay_effect_id: str
    glyph_render_kind: str
    template_id: str
    stage_roles: tuple[str, ...]
    min_stable_hold_ms: int | None = None
    send_room: str | None = None


RASTER_DEMO_CASES: tuple[RasterDemoCase, ...] = (
    RasterDemoCase(
        hail_id="hail.fleet_beacon.001",
        fixture_path="config/hails/fixtures/raster-presentation-demo.hail.json",
        exemplar_path="config/hails/glyph-exemplars/raster-fleet-beacon.v001.json",
        overlay_effect_id="transporter_beam",
        glyph_render_kind="image_layers",
        template_id="stage-breakout-v1",
        stage_roles=("back", "front"),
    ),
    RasterDemoCase(
        hail_id="hail.warden_alert.001",
        fixture_path="config/hails/fixtures/raster-warden-alert-demo.hail.json",
        exemplar_path="config/hails/glyph-exemplars/raster-warden-sigil.v001.json",
        overlay_effect_id="pop",
        glyph_render_kind="image",
        template_id="stage-medallion-v1",
        stage_roles=("back",),
        min_stable_hold_ms=9000,
    ),
    RasterDemoCase(
        hail_id="hail.combadge.001",
        fixture_path="config/hails/fixtures/raster-combadge-production.hail.json",
        exemplar_path="config/hails/glyph-exemplars/raster-combadge.v001.json",
        overlay_effect_id="transporter_beam",
        glyph_render_kind="image",
        template_id="stage-medallion-v1",
        stage_roles=("back",),
        send_room="master_bedroom",
    ),
)


def repo_root() -> Path:
    return _resolve_repo_root()


def load_demo_case(case: RasterDemoCase) -> tuple[dict[str, Any], dict[str, dict[str, Any]]]:
    root = repo_root()
    record = json.loads((root / case.fixture_path).read_text(encoding="utf-8"))
    record["id"] = case.hail_id
    exemplar = json.loads((root / case.exemplar_path).read_text(encoding="utf-8"))
    glyph_id = str(exemplar.get("glyph_id") or "").strip()
    if not glyph_id:
        raise ValueError(f"exemplar missing glyph_id: {case.exemplar_path}")
    custom_glyphs = {glyph_id: exemplar}
    return record, custom_glyphs


def build_demo_delivery_envelope(case: RasterDemoCase) -> dict[str, Any]:
    record, custom_glyphs = load_demo_case(case)
    base = build_consumer_render_payload(record, custom_glyphs=custom_glyphs)
    payload = enrich_consumer_render_payload_v2(base, record, custom_glyphs=custom_glyphs)
    if payload.get("catalog_ready") is not True:
        errors = payload.get("consumer_validation_errors")
        raise AssertionError(f"{case.hail_id} not catalog_ready: {errors}")
    return build_delivery_envelope(payload)


def validate_demo_delivery(case: RasterDemoCase) -> list[str]:
    """Return human-readable failures; empty list means pass."""
    failures: list[str] = []
    try:
        envelope = build_demo_delivery_envelope(case)
    except Exception as exc:  # noqa: BLE001 — smoke aggregator
        return [f"{case.hail_id}: {exc}"]

    overlay = envelope.get("overlay")
    if not isinstance(overlay, dict):
        return [f"{case.hail_id}: missing overlay"]

    if str(overlay.get("effect_id") or "") != case.overlay_effect_id:
        failures.append(
            f"{case.hail_id}: effect_id expected {case.overlay_effect_id!r}, "
            f"got {overlay.get('effect_id')!r}",
        )

    glyph_render = overlay.get("glyph_render")
    if not isinstance(glyph_render, dict):
        failures.append(f"{case.hail_id}: missing glyph_render")
    elif str(glyph_render.get("kind") or "") != case.glyph_render_kind:
        failures.append(
            f"{case.hail_id}: glyph_render.kind expected {case.glyph_render_kind!r}, "
            f"got {glyph_render.get('kind')!r}",
        )

    template = overlay.get("presentation_template")
    if not isinstance(template, dict):
        failures.append(f"{case.hail_id}: missing presentation_template")
    elif str(template.get("template_id") or "") != case.template_id:
        failures.append(
            f"{case.hail_id}: template_id expected {case.template_id!r}, "
            f"got {template.get('template_id')!r}",
        )
    else:
        stage_assets = template.get("stage_assets")
        if not isinstance(stage_assets, dict):
            failures.append(f"{case.hail_id}: presentation_template.stage_assets missing")
        else:
            for role in case.stage_roles:
                asset = stage_assets.get(role)
                if not isinstance(asset, dict) or not str(asset.get("image_base64") or "").strip():
                    failures.append(f"{case.hail_id}: stage_assets.{role} missing inline PNG")

    lifecycle = overlay.get("lifecycle_timing")
    if not isinstance(lifecycle, dict):
        failures.append(f"{case.hail_id}: missing lifecycle_timing")
    else:
        hold = lifecycle.get("stable_hold_ms")
        duration = overlay.get("duration_ms")
        if hold is None:
            failures.append(f"{case.hail_id}: lifecycle_timing.stable_hold_ms not set")
        elif case.min_stable_hold_ms is not None and int(hold) < case.min_stable_hold_ms:
            failures.append(
                f"{case.hail_id}: stable_hold_ms {hold} < {case.min_stable_hold_ms}",
            )
        total = lifecycle.get("total_timed_lifecycle_ms")
        if total is None and hold is not None:
            failures.append(f"{case.hail_id}: total_timed_lifecycle_ms not set")

    if case.overlay_effect_id == "pop":
        anchors = (
            overlay.get("effect_identity", {}).get("choreography_anchors")
            if isinstance(overlay.get("effect_identity"), dict)
            else None
        )
        if isinstance(anchors, dict) and anchors.get("glyphLockIn") == 0.72:
            failures.append(f"{case.hail_id}: pop still has medallion template choreography merged")

    return failures


def validate_all_offline() -> list[str]:
    failures: list[str] = []
    for case in RASTER_DEMO_CASES:
        failures.extend(validate_demo_delivery(case))
    return failures

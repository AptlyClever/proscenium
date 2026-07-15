"""Axiom-owned Hail delivery — send queue, cooldown, overlay POST to APK."""

from __future__ import annotations

import hashlib
import hmac
import json
import os
import threading
import time
import urllib.error
import urllib.request
from typing import Any, Callable

from hails.hail_package_v2 import build_delivery_envelope, recompose_package_layout_for_delivery
from hails.hails_palette_presentation import resolve_delivery_palette_for_overlay
from hails.hails_consumer_capability import load_consumer_capability_manifest
from presentation.delivery import (
    get_product_delivery_target,
    load_delivery_registry,
)

COOLDOWN_AFTER_CLEARED_MS = 3000
QUEUE_MAX = 1

_lock = threading.Lock()
_active_sends: dict[str, float] = {}
_cooldown_until: dict[str, float] = {}
_queued: dict[str, str | None] = {}


def load_delivery_targets() -> dict[str, Any]:
    """Compatibility projection from the shared presentation registry."""
    registry = load_delivery_registry()
    targets: dict[str, Any] = {}
    for target_id, target in (registry.get("targets") or {}).items():
        if not isinstance(target, dict):
            continue
        products = target.get("products")
        adapter = products.get("hails") if isinstance(products, dict) else None
        if not isinstance(adapter, dict) or adapter.get("enabled") is False:
            continue
        targets[target_id] = {
            **adapter,
            "delivery_target_id": target_id,
            "label": target.get("label"),
            "display_class": target.get("display_class"),
        }
    return {
        "version": "presentation-registry-v001",
        "default_target_id": registry.get("default_target_id"),
        "targets": targets,
    }


def get_delivery_target(target_id: str | None = None) -> dict[str, Any] | None:
    return get_product_delivery_target("hails", target_id)


def _broker_secret() -> str | None:
    secret = (os.environ.get("PROSCENIUM_HAIL_DELIVERY_BROKER_SECRET") or "").strip()
    if len(secret) < 16:
        secret = (os.environ.get("AXIOM_HAIL_DELIVERY_BROKER_SECRET") or "").strip()
    if len(secret) < 16:
        secret = (os.environ.get("LCARD_OVERLAY_BROKER_SECRET") or "").strip()
    return secret if len(secret) >= 16 else None


def _normalize_size_tier(value: Any) -> str:
    tier = str(value or "").strip().lower()
    if tier in ("small", "s"):
        return "small"
    if tier in ("large", "l"):
        return "large"
    return "medium"


def _format_proof_number(value: Any) -> str:
    if value in ("", None):
        return ""
    try:
        numeric = float(value)
        if numeric == int(numeric):
            return str(int(numeric))
        return str(numeric)
    except (TypeError, ValueError):
        return str(value)


def _canonical_proof_input(overlay: dict[str, Any]) -> str:
    placement_mode = str(overlay.get("placement_mode") or "preset")
    normalized = {
        "hail_id": str(overlay.get("hail_id") or ""),
        "effect_id": str(overlay.get("effect_id") or ""),
        "glyph_id": str(overlay.get("glyph_id") or ""),
        "palette_id": str(overlay.get("palette_id") or "axiom_dark_cyan"),
        "message": str(overlay.get("message") or ""),
        "duration_ms": _format_proof_number(overlay.get("duration_ms")),
        "placement_id": str(overlay.get("placement_id") or ""),
        "placement_mode": placement_mode,
        "x_percent": "",
        "y_percent": "",
        "size_tier": _normalize_size_tier(overlay.get("size_tier")),
    }
    if placement_mode == "custom":
        normalized["x_percent"] = _format_proof_number(overlay.get("x_percent"))
        normalized["y_percent"] = _format_proof_number(overlay.get("y_percent"))
    return "|".join(normalized.values())


def attach_broker_proof(overlay: dict[str, Any]) -> dict[str, Any]:
    secret = _broker_secret()
    if not secret:
        err = ValueError("Hail delivery broker secret is not configured")
        err.code = "HAIL_DELIVERY_BROKER_NOT_CONFIGURED"  # type: ignore[attr-defined]
        raise err
    body = dict(overlay)
    body["palette_id"] = resolve_delivery_palette_for_overlay(
        str(body.get("palette_id") or ""),
        str(body.get("effect_variation_id") or "").strip() or None,
    )
    proof = hmac.new(
        secret.encode("utf-8"),
        _canonical_proof_input(body).encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    body["broker_proof"] = proof
    return body


def lifecycle_cleared_ms(payload: dict[str, Any]) -> int:
    lifecycle = payload.get("lifecycle_timing")
    if isinstance(lifecycle, dict):
        total = lifecycle.get("total_timed_lifecycle_ms")
        if total is not None:
            try:
                return max(0, int(total))
            except (TypeError, ValueError):
                pass
        entrance = int(lifecycle.get("entrance_animation_ms") or 1900)
        hold = int(lifecycle.get("stable_hold_ms") or payload.get("duration_ms") or 5500)
        exit_ms = int(lifecycle.get("exit_animation_ms") or 1400)
        return entrance + hold + exit_ms
    return 8800


def _cooldown_key(target_id: str) -> str:
    return target_id


def cooldown_remaining_ms(target_id: str, *, now: float | None = None) -> int:
    ts = now if now is not None else time.time()
    until = _cooldown_until.get(_cooldown_key(target_id), 0.0)
    remaining = until - ts
    return max(0, int(remaining * 1000))


def reset_delivery_state_for_tests() -> None:
    with _lock:
        _active_sends.clear()
        _cooldown_until.clear()
        _queued.clear()


def post_overlay(
    target: dict[str, Any],
    overlay: dict[str, Any],
    *,
    timeout_s: float = 2.5,
    urlopen: Callable[..., Any] | None = None,
) -> dict[str, Any]:
    base_url = str(target.get("base_url") or "").rstrip("/")
    show_path = str(target.get("show_path") or "/hail/show")
    url = f"{base_url}{show_path}"
    body = json.dumps(attach_broker_proof(overlay)).encode("utf-8")
    request = urllib.request.Request(
        url,
        data=body,
        headers={"Content-Type": "application/json", "Accept": "application/json"},
        method="POST",
    )
    opener = urlopen or urllib.request.urlopen
    try:
        with opener(request, timeout=timeout_s) as response:
            status = getattr(response, "status", None) or response.getcode()
            if status and int(status) >= 400:
                raise urllib.error.HTTPError(url, int(status), "overlay failed", {}, None)
    except urllib.error.HTTPError as exc:
        err = ValueError(f"Hail overlay request failed with status {exc.code}")
        err.code = "HAIL_DELIVERY_OVERLAY_FAILED"  # type: ignore[attr-defined]
        raise err from exc
    except TimeoutError as exc:
        err = ValueError("Hail overlay request timed out")
        err.code = "HAIL_DELIVERY_TIMEOUT"  # type: ignore[attr-defined]
        raise err from exc
    return {
        "renderer": "hail_overlay",
        "delivery_target_id": target.get("delivery_target_id"),
        "url": url,
    }


def send_hail_package(
    payload: dict[str, Any],
    *,
    delivery_target_id: str | None = None,
    source: str = "axiom",
    skip_cooldown: bool = False,
    urlopen: Callable[..., Any] | None = None,
) -> dict[str, Any]:
    manifest = load_consumer_capability_manifest()
    delivery = manifest.get("delivery") if isinstance(manifest.get("delivery"), dict) else {}
    cooldown_ms = int(delivery.get("cooldown_after_lifecycle_cleared_ms") or COOLDOWN_AFTER_CLEARED_MS)

    if payload.get("catalog_ready") is not True:
        return {
            "ok": False,
            "status": 400,
            "code": "HAIL_NOT_CATALOG_READY",
            "error": "Hail package is not catalog_ready; save a deliverable hail first",
        }

    target = get_delivery_target(delivery_target_id)
    if not target:
        return {
            "ok": False,
            "status": 503,
            "code": "HAIL_DELIVERY_TARGET_NOT_CONFIGURED",
            "error": "Hail delivery target is not configured",
        }

    target_id = str(target.get("delivery_target_id") or delivery_target_id or "arcade")
    key = _cooldown_key(target_id)
    now = time.time()

    with _lock:
        if not skip_cooldown:
            remaining = cooldown_remaining_ms(target_id, now=now)
            if remaining > 0:
                return {
                    "ok": False,
                    "status": 429,
                    "code": "HAIL_SEND_COOLDOWN",
                    "retry_after_ms": remaining,
                    "delivery_target_id": target_id,
                }
        if key in _active_sends:
            if _queued.get(key):
                return {
                    "ok": False,
                    "status": 429,
                    "code": "HAIL_SEND_QUEUE_FULL",
                    "error": "Send queue is full (max 1)",
                    "delivery_target_id": target_id,
                }
            hail_id = str(payload.get("hail_id") or "")
            _queued[key] = hail_id
            return {
                "ok": True,
                "status": 202,
                "code": "HAIL_SEND_QUEUED",
                "queued": True,
                "hail_id": hail_id,
                "delivery_target_id": target_id,
            }
        _active_sends[key] = now

    try:
        delivery_payload = recompose_package_layout_for_delivery(
            payload,
            delivery_target_id=target_id,
        )
        envelope = build_delivery_envelope(delivery_payload)
        overlay = envelope["overlay"]
        result = post_overlay(target, overlay, urlopen=urlopen)
        cleared_ms = lifecycle_cleared_ms(payload)
        with _lock:
            _cooldown_until[key] = time.time() + (cleared_ms + cooldown_ms) / 1000.0
        return {
            "ok": True,
            "status": 200,
            "code": "HAIL_SENT",
            "hail_id": payload.get("hail_id"),
            "delivery_target_id": target_id,
            "source": source,
            "lifecycle_cleared_ms": cleared_ms,
            "cooldown_after_ms": cooldown_ms,
            "renderer": result.get("renderer"),
        }
    finally:
        with _lock:
            _active_sends.pop(key, None)
            queued_id = _queued.pop(key, None)
            if queued_id and queued_id != payload.get("hail_id"):
                pass

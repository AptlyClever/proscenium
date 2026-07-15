"""Product-neutral home presentation delivery.

Proscenium owns selection of a display target and its product adapter. Product
services (Bandit, Hails) retain their domain state; display runtimes retain
their renderers.
"""

from __future__ import annotations

import json
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any, Callable

REGISTRY_REL = Path("config") / "presentation" / "delivery-targets.json"
ALLOWED_ACTIONS = ("show", "dismiss")


def _repo_root() -> Path:
    module_dir = Path(__file__).resolve()
    for candidate in module_dir.parents:
        if (candidate / "config").is_dir():
            return candidate
    return module_dir.parents[2]


def load_delivery_registry() -> dict[str, Any]:
    path = _repo_root() / REGISTRY_REL
    with path.open(encoding="utf-8") as fh:
        doc = json.load(fh)
    if not isinstance(doc, dict) or not isinstance(doc.get("targets"), dict):
        raise ValueError("invalid_presentation_delivery_registry")
    return doc


def get_product_delivery_target(
    product_id: str,
    target_id: str | None = None,
) -> dict[str, Any] | None:
    doc = load_delivery_registry()
    resolved_target_id = str(
        target_id or doc.get("default_target_id") or "arcade"
    ).strip()
    target = doc["targets"].get(resolved_target_id)
    if not isinstance(target, dict):
        return None
    products = target.get("products")
    adapter = products.get(product_id) if isinstance(products, dict) else None
    if not isinstance(adapter, dict) or adapter.get("enabled") is False:
        return None
    return {
        **adapter,
        "delivery_target_id": resolved_target_id,
        "label": target.get("label"),
        "display_class": target.get("display_class"),
        "product_id": product_id,
    }


def product_capabilities() -> dict[str, Any]:
    """Return target capabilities without exposing device URLs."""
    doc = load_delivery_registry()
    targets: dict[str, Any] = {}
    for target_id, target in doc["targets"].items():
        if not isinstance(target, dict):
            continue
        products = target.get("products")
        targets[target_id] = {
            "delivery_target_id": target_id,
            "label": target.get("label"),
            "display_class": target.get("display_class"),
            "products": {
                product_id: {
                    "renderer": adapter.get("renderer"),
                    "actions": [
                        action
                        for action in ALLOWED_ACTIONS
                        if adapter.get(f"{action}_path")
                    ],
                }
                for product_id, adapter in (
                    products.items() if isinstance(products, dict) else []
                )
                if isinstance(adapter, dict) and adapter.get("enabled") is not False
            },
        }
    return {
        "schema_version": doc.get("schema_version", 1),
        "default_target_id": doc.get("default_target_id"),
        "targets": targets,
    }


def deliver_product_action(
    product_id: str,
    action: str,
    *,
    delivery_target_id: str | None = None,
    payload: dict[str, Any] | None = None,
    timeout_s: float = 3.0,
    urlopen: Callable[..., Any] | None = None,
) -> dict[str, Any]:
    normalized_product = str(product_id or "").strip()
    normalized_action = str(action or "").strip().lower()
    if not normalized_product:
        raise ValueError("product_id_required")
    if normalized_action not in ALLOWED_ACTIONS:
        raise ValueError(f"unsupported_presentation_action:{normalized_action}")

    target = get_product_delivery_target(normalized_product, delivery_target_id)
    if target is None:
        raise KeyError(
            f"presentation_target_not_configured:{normalized_product}:"
            f"{delivery_target_id or 'default'}"
        )
    path = str(target.get(f"{normalized_action}_path") or "").strip()
    if not path:
        raise ValueError(
            f"presentation_action_not_supported:{normalized_product}:{normalized_action}"
        )
    base_url = str(target.get("base_url") or "").rstrip("/")
    if not base_url:
        raise ValueError("presentation_target_base_url_missing")

    body = dict(target.get("default_payload") or {})
    body.update(payload or {})
    body["product_id"] = normalized_product
    body["delivery_target_id"] = target["delivery_target_id"]
    encoded = json.dumps(body).encode("utf-8")
    request = urllib.request.Request(
        f"{base_url}{path}",
        data=encoded,
        headers={"Content-Type": "application/json", "Accept": "application/json"},
        method="POST",
    )
    opener = urlopen or urllib.request.urlopen
    try:
        with opener(request, timeout=timeout_s) as response:
            status = int(getattr(response, "status", response.getcode()))
            raw = response.read() if hasattr(response, "read") else b""
    except urllib.error.HTTPError as exc:
        raise ValueError(
            f"presentation_adapter_failed:{normalized_product}:{exc.code}"
        ) from exc
    except (urllib.error.URLError, TimeoutError) as exc:
        raise ValueError(
            f"presentation_adapter_unreachable:{normalized_product}"
        ) from exc
    if status < 200 or status >= 300:
        raise ValueError(f"presentation_adapter_failed:{normalized_product}:{status}")

    adapter_response: Any = None
    if raw:
        try:
            adapter_response = json.loads(raw.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            adapter_response = None
    return {
        "ok": True,
        "code": "PRESENTATION_ACTION_DELIVERED",
        "product_id": normalized_product,
        "action": normalized_action,
        "delivery_target_id": target["delivery_target_id"],
        "display_class": target.get("display_class"),
        "renderer": target.get("renderer"),
        "adapter_response": adapter_response,
    }

"""Product delivery APIs owned by Proscenium."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException

from presentation.delivery import deliver_product_action, product_capabilities

router = APIRouter()


@router.get("/api/presentation/products")
async def get_product_delivery_capabilities() -> dict[str, Any]:
    return product_capabilities()


@router.post("/api/presentation/products/{product_id}/{action}")
async def post_product_delivery_action(
    product_id: str,
    action: str,
    body: dict[str, Any] | None = None,
) -> dict[str, Any]:
    request_body = body or {}
    delivery_target_id = (
        request_body.get("delivery_target_id")
        or request_body.get("target_room_id")
        or request_body.get("targetRoomId")
    )
    payload = request_body.get("payload")
    if payload is not None and not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="presentation_payload_must_be_object")
    # Convenience fields remain outside `payload` for LCARD/operator callers.
    adapter_payload = dict(payload or {})
    if request_body.get("ws_url"):
        adapter_payload["ws_url"] = request_body["ws_url"]

    try:
        return deliver_product_action(
            product_id,
            action,
            delivery_target_id=(
                str(delivery_target_id).strip() if delivery_target_id else None
            ),
            payload=adapter_payload,
        )
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        message = str(exc)
        status = 502 if (
            "adapter_failed" in message or "adapter_unreachable" in message
        ) else 400
        raise HTTPException(status_code=status, detail=message) from exc

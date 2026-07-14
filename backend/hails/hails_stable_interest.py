"""Phase III stable-phase interest — hero-led residual during hold."""

from __future__ import annotations

from typing import Any

from hails.hails_priority import normalize_priority_level
from hails.hails_render_contract import load_hail_render_contract_for_generation, named_effect_identity


def resolve_stable_interest(
    *,
    effect_id: str,
    variation_id: str | None,
    priority_level: Any,
    contract: dict[str, Any] | None = None,
) -> dict[str, Any] | None:
    doc = contract or load_hail_render_contract_for_generation("v002-beta")
    identity = named_effect_identity(doc, effect_id, variation_id)
    stable_residual = str(identity.get("stableResidual") or "none")
    if stable_residual != "optional_glyph_local":
        return None

    preview = doc.get("previewVisual") if isinstance(doc.get("previewVisual"), dict) else {}
    block = preview.get("stableInterest") if isinstance(preview.get("stableInterest"), dict) else {}
    variation_shimmer = (
        preview.get("transporterVariationStableShimmer")
        if isinstance(preview.get("transporterVariationStableShimmer"), dict)
        else {}
    )
    priority = normalize_priority_level(priority_level)
    shimmer_scales = block.get("priorityShimmerScale") if isinstance(block.get("priorityShimmerScale"), dict) else {}
    rim_pulse = block.get("priorityRimPulse") if isinstance(block.get("priorityRimPulse"), dict) else {}

    var_key = (variation_id or "voyaging").strip() or "voyaging"
    shimmer_base = float(block.get("glyphShimmerBase", 0.32))
    var_shimmer = float(variation_shimmer.get(var_key, shimmer_base))
    priority_scale = float(shimmer_scales.get(priority, shimmer_scales.get("green", 1.0)))

    return {
        "stable_residual": stable_residual,
        "glyph_breathe_amplitude": float(block.get("glyphBreatheAmplitude", 0.06)),
        "glyph_shimmer_intensity": min(0.55, var_shimmer * priority_scale),
        "stable_rim_pulse_ms": int(block.get("stableRimPulseMs", 420)),
        "rim_pulse_enabled": bool(rim_pulse.get(priority, False)),
    }

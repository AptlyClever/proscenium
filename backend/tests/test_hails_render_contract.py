"""Axiom-owned Hails render contract validation and consumer payload tests."""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from hails.hails_render_contract import (
    active_effect_ids,
    android_effect_tuning_subset,
    build_consumer_render_payload,
    contract_path,
    default_variation_id_for_effect,
    effect_registry_for_api,
    load_hail_render_contract,
    named_effect_identity,
    normalize_effect_tuning,
    normalize_effect_variation_id,
    normalize_named_effect_id,
    normalize_size_tier,
    render_contract_summary,
    resolve_effect_lifecycle_timing,
    resolve_size_code,
    validate_contract_integrity,
    validate_effect_tuning,
    validate_effect_variation_id,
)
from hails.hails_spoon_transporter import spoon_transporter_custom_glyphs
from lcard_hail_seed import load_lcard_hail_seed
from main import app
from settings import settings


def _client(tmp_path: Path, monkeypatch, initial: dict | None = None) -> TestClient:
    p = tmp_path / "axiom-settings.json"
    p.write_text(json.dumps(initial or {}), encoding="utf-8")
    monkeypatch.setattr(settings, "settings_path", p)
    return TestClient(app)


def test_contract_file_exists_and_parses() -> None:
    assert contract_path().is_file()
    doc = load_hail_render_contract()
    assert doc["version"] == "v001-integration"
    assert doc["ownership"]["hails"] == "axiom"
    assert validate_contract_integrity(doc) == []


def test_named_effects_allowlist() -> None:
    doc = load_hail_render_contract()
    allowlist = doc["previewVisual"]["namedEffects"]["allowlist"]
    assert allowlist == ["none", "pop", "burst", "transporter"]


def test_lifecycle_timing_separation_transporter() -> None:
    timing = resolve_effect_lifecycle_timing("transporter", 5000)
    assert timing["stable_hold_ms"] == 5000
    assert timing["entrance_animation_ms"] == 1900
    assert timing["exit_animation_ms"] == 1400
    assert timing["beam_in_seed_ms"] == 800
    assert timing["beam_out_seed_ms"] == 420
    assert timing["total_timed_lifecycle_ms"] == 8300


def test_legacy_effect_alias_normalization() -> None:
    assert normalize_named_effect_id("transporter_beam") == "transporter"
    assert normalize_named_effect_id("burst") == "burst"


def test_entrance_ordering_pop_burst_transporter() -> None:
    doc = load_hail_render_contract()
    effects = doc["previewVisual"]["namedEffects"]["effects"]
    pop = effects["pop"]["lifecycleTiming"]["entrance_animation_ms"]
    burst = effects["burst"]["lifecycleTiming"]["entrance_animation_ms"]
    transporter = effects["transporter"]["lifecycleTiming"]["entrance_animation_ms"]
    assert pop < burst < transporter


def test_consumer_render_payload_from_seed() -> None:
    seed = load_lcard_hail_seed()[0]
    payload = build_consumer_render_payload(seed)
    assert payload["effect_id"] == "transporter"
    assert payload["ownership"] == "axiom"
    assert payload["lifecycle_timing"]["stable_hold_ms"] == 5000
    assert payload["effect_identity"]["glyph_resolve_style"] == "scan_resolve"


def test_render_contract_summary() -> None:
    summary = render_contract_summary()
    assert "pop_tuning_note" in summary
    assert summary["default_named_effect"] == "transporter"


def test_api_render_contract_endpoint() -> None:
    client = TestClient(app)
    r = client.get("/api/hails/render-contract")
    assert r.status_code == 200
    body = r.json()
    assert body["summary"]["version"] == "v001-integration"
    assert body["contract"]["ownership"]["hails"] == "axiom"


def test_named_effects_allowlist() -> None:
    doc = load_hail_render_contract()
    allowlist = doc["previewVisual"]["namedEffects"]["allowlist"]
    assert allowlist == ["none", "pop", "burst", "transporter"]
    assert active_effect_ids(doc) == ("none", "pop", "burst", "transporter")


def test_effect_registry_includes_planned_scan() -> None:
    registry = effect_registry_for_api()
    ids = [entry["id"] for entry in registry["entries"]]
    assert "scan" in ids
    scan = next(entry for entry in registry["entries"] if entry["id"] == "scan")
    assert scan["status"] == "planned"
    assert scan["id"] not in registry["active_effect_ids"]


def test_effect_registry_tuning_validation() -> None:
    assert validate_effect_tuning("transporter", {"beam_intensity": 0.5}) == []
    errors = validate_effect_tuning("transporter", {"beam_intensity": 9.0})
    assert any("/beam_intensity" in e["path"] for e in errors)
    errors = validate_effect_tuning("transporter", {"beam_shape": "invalid"})
    assert errors


def test_normalize_effect_tuning_applies_defaults() -> None:
    normalized = normalize_effect_tuning("transporter", None)
    assert normalized["beam_intensity"] == 0.78
    assert normalized["beam_shape"] == "column"
    partial = normalize_effect_tuning("transporter", {"beam_intensity": 0.9})
    assert partial["beam_intensity"] == 0.9
    assert partial["beam_shape"] == "column"


def test_api_list_includes_effect_registry() -> None:
    client = TestClient(app)
    r = client.get("/api/hails")
    assert r.status_code == 200
    data = r.json()
    assert "transporter" in data["known_effects"]
    registry = data["effect_registry"]
    assert registry["default_effect_id"] == "transporter"
    assert any(entry["id"] == "transporter" for entry in registry["entries"])
    transporter = next(entry for entry in registry["entries"] if entry["id"] == "transporter")
    assert any(var["key"] == "beam_intensity" for var in transporter["tuning_variables"])
    assert transporter["preview_identity"]["glyphResolveStyle"] == "scan_resolve"
    assert transporter["preview_identity"]["fieldStyle"] == "vertical_phase"


def test_api_render_contract_includes_effect_registry() -> None:
    client = TestClient(app)
    r = client.get("/api/hails/render-contract")
    assert r.status_code == 200
    body = r.json()
    assert "effect_registry" in body
    assert body["summary"]["named_effect_allowlist"] == ["none", "pop", "burst", "transporter"]


def test_api_list_includes_known_effects() -> None:
    client = TestClient(app)
    r = client.get("/api/hails")
    assert r.status_code == 200
    data = r.json()
    assert "transporter" in data["known_effects"]
    assert data["render_contract"]["version"] == "v001-integration"


def test_api_render_payload_for_seed_hail(tmp_path, monkeypatch) -> None:
    client = _client(
        tmp_path,
        monkeypatch,
        {"custom_glyphs": spoon_transporter_custom_glyphs()},
    )
    client.post("/api/hails", json={"id": "hail.spoon_transporter.001", "name": "Spoon", "message": {"short_text": "Sniff"}, "icon": {"value": "default"}, "visual": {"effect_id": "transporter", "effect_variation_id": "voyaging", "scale": "large", "placement_id": "upper_center", "placement_mode": "preset", "palette_id": "axiom_dark_cyan", "duration_ms": 5000}, "delivery_policy": {"routes": [{"id": "r1", "launch_room_id": "arcade", "destination_room_id": "master_bedroom", "provider": "lcard", "enabled": True}]}})
    r = client.get("/api/hails/hail.spoon_transporter.001/render-payload")
    assert r.status_code == 200
    payload = r.json()
    assert payload["hail_id"] == "hail.spoon_transporter.001"
    assert payload["effect_id"] == "transporter"
    assert payload["glyph_id"] == "custom-spoon-transporter"
    assert payload["glyph_render"]["representation"] == "projected"
    lt = payload["lifecycle_timing"]
    assert lt["entrance_animation_ms"] == 1900
    assert lt["exit_animation_ms"] == 1400
    assert lt["total_timed_lifecycle_ms"] == (
        lt["entrance_animation_ms"] + lt["stable_hold_ms"] + lt["exit_animation_ms"]
    )


def test_consumer_render_payload_spoon_transporter_glyph_projection() -> None:
    seed = next(h for h in load_lcard_hail_seed() if h.get("id") == "hail.spoon_transporter.001")
    glyphs = spoon_transporter_custom_glyphs()
    payload = build_consumer_render_payload(seed, custom_glyphs=glyphs)
    assert payload["glyph_id"] == "custom-spoon-transporter"
    assert payload["hail_id"] == "hail.spoon_transporter.001"
    assert payload["glyph_render"]["kind"] == "procedural"
    assert payload["glyph_render"]["representation"] == "projected"
    assert payload["glyph_render"]["projection_id"] == "google_tv_v1"
    assert payload["glyph_render_canonical"]["representation"] == "canonical"


def test_api_render_payload_for_seed_hail_endpoint(tmp_path, monkeypatch) -> None:
    client = _client(
        tmp_path,
        monkeypatch,
        {"custom_glyphs": spoon_transporter_custom_glyphs()},
    )
    r = client.get("/api/hails/hail.spoon_transporter.001/render-payload")
    assert r.status_code == 200
    payload = r.json()
    assert payload["glyph_id"] == "custom-spoon-transporter"


def test_normalize_size_tier_and_size_code() -> None:
    assert normalize_size_tier("large") == "large"
    assert normalize_size_tier("L") == "large"
    assert normalize_size_tier("medium") == "medium"
    assert normalize_size_tier("M") == "medium"
    assert normalize_size_tier("small") == "small"
    assert normalize_size_tier("S") == "small"
    assert normalize_size_tier(None) == "medium"
    assert normalize_size_tier("unknown-tier") == "medium"
    assert resolve_size_code("large") == "L"
    assert resolve_size_code("medium") == "M"
    assert resolve_size_code("small") == "S"


def test_consumer_render_payload_includes_size_tier_fields() -> None:
    seed = next(h for h in load_lcard_hail_seed() if h.get("id") == "hail.spoon_transporter.001")
    payload = build_consumer_render_payload(seed)
    assert payload["size_tier"] == "medium"
    assert payload["size_code"] == "M"
    assert "visual" not in payload


def test_consumer_render_payload_respects_medium_scale_override() -> None:
    seed = next(h for h in load_lcard_hail_seed() if h.get("id") == "hail.spoon_transporter.001")
    medium_seed = {**seed, "visual": {**seed["visual"], "scale": "medium"}}
    payload = build_consumer_render_payload(medium_seed)
    assert payload["size_tier"] == "medium"
    assert payload["size_code"] == "M"


def test_seed_hail_size_tier_projection_medium() -> None:
    hails = {h["id"]: build_consumer_render_payload(h) for h in load_lcard_hail_seed()}
    assert hails["hail.spoon_transporter.001"]["size_tier"] == "medium"
    assert hails["hail.spoon_transporter.001"]["size_code"] == "M"


def test_consumer_render_payload_downstream_lcard_overlay_projection() -> None:
    """Document fields LCARD adapter consumes from Axiom render-payload."""
    seed = next(h for h in load_lcard_hail_seed() if h.get("id") == "hail.spoon_transporter.001")
    payload = build_consumer_render_payload(seed)
    required = {
        "hail_id",
        "effect_id",
        "effect_variation_id",
        "effect_variation",
        "effect_tuning",
        "effect_tuning_projection",
        "android_effect_tuning",
        "capability_summary",
        "glyph_id",
        "glyph_render",
        "render_target",
        "palette_id",
        "message",
        "duration_ms",
        "placement_id",
        "placement_mode",
        "size_tier",
        "size_code",
        "contract_version",
        "ownership",
        "lifecycle_timing",
        "effect_identity",
    }
    assert required.issubset(payload.keys())
    assert payload["effect_id"] == "transporter"
    assert payload["contract_version"] == "v002-beta"
    assert payload["ownership"] == "axiom"
    assert payload["effect_tuning"]["beam_intensity"] == 0.78
    assert payload["effect_tuning_projection"]["beamOpacity"] == 0.78
    assert payload["android_effect_tuning"]["beam_intensity"] == 0.78
    assert payload["capability_summary"]["android"] == "partial"
    assert "beam_intensity" in payload["capability_summary"]["android_tuning_keys"]


def test_transporter_variations_in_contract() -> None:
    doc = load_hail_render_contract()
    assert validate_contract_integrity(doc) == []
    assert default_variation_id_for_effect(doc, "transporter") == "voyaging"
    assert normalize_effect_variation_id("transporter", None, doc) == "voyaging"
    assert normalize_effect_variation_id("transporter", "spoon", doc) == "spoon"
    assert normalize_effect_variation_id("transporter", "invalid", doc) is None
    assert validate_effect_variation_id("transporter", "spoon", doc) == []
    assert validate_effect_variation_id("transporter", "nope", doc)
    assert validate_effect_variation_id("none", "voyaging", doc)


def test_effect_registry_api_exposes_transporter_variations() -> None:
    registry = effect_registry_for_api()
    transporter = next(entry for entry in registry["entries"] if entry["id"] == "transporter")
    variation_ids = {row["id"] for row in transporter["variations"]}
    assert variation_ids == {"voyaging", "generation-next", "spoon"}
    assert transporter["default_variation_id"] == "voyaging"
    spoon = next(row for row in transporter["variations"] if row["id"] == "spoon")
    assert spoon["label"] == "Spoon"
    assert spoon["recommended_palette_id"] == "transporter_spoon"
    tng = next(row for row in transporter["variations"] if row["id"] == "generation-next")
    assert tng["preview_identity"]["choreographyAnchors"]["glyphResolveStart"] == 0.38
    assert spoon["preview_identity"]["particleStyle"] == "scanfall_dense"


def test_transporter_variation_choreography_locked() -> None:
    doc = load_hail_render_contract()
    voy = named_effect_identity(doc, "transporter", "voyaging")
    tng = named_effect_identity(doc, "transporter", "generation-next")
    spoon = named_effect_identity(doc, "transporter", "spoon")
    assert voy["choreographyAnchors"]["glyphLockIn"] == 0.9
    assert tng["choreographyAnchors"]["glyphLockIn"] == 0.88
    assert tng["choreographyAnchors"]["messageRevealStart"] == 0.8
    assert spoon["choreographyAnchors"]["glyphLockIn"] == 0.86
    assert spoon["choreographyAnchors"]["messageRevealStart"] == 0.78
    locked = doc["previewVisual"]["transporterVariationChoreography"]
    assert locked["spoon"]["glyphResolveStart"] == 0.4


def test_named_effect_identity_merges_variation_anchors() -> None:
    doc = load_hail_render_contract()
    base = named_effect_identity(doc, "transporter")
    tng = named_effect_identity(doc, "transporter", "generation-next")
    assert tng["glyphResolveStyle"] == base["glyphResolveStyle"]
    assert tng["choreographyAnchors"]["glyphResolveStart"] == 0.38
    assert base["choreographyAnchors"]["glyphResolveStart"] != 0.38

    pop_snap = named_effect_identity(doc, "pop", "snap-back")
    assert pop_snap["choreographyAnchors"]["glyphLockIn"] == 0.48
    burst_rippler = named_effect_identity(doc, "burst", "rippler")
    assert burst_rippler["choreographyAnchors"]["messageRevealStart"] == 0.75


def test_pop_and_burst_variations_in_contract() -> None:
    doc = load_hail_render_contract()
    assert validate_contract_integrity(doc) == []
    assert default_variation_id_for_effect(doc, "pop") == "soft-tap"
    assert default_variation_id_for_effect(doc, "burst") == "pulse"
    assert normalize_effect_variation_id("pop", None, doc) == "soft-tap"
    assert normalize_effect_variation_id("burst", "solar-flare", doc) == "solar-flare"
    assert normalize_effect_variation_id("pop", "invalid", doc) is None


def test_effect_registry_api_exposes_pop_burst_variations() -> None:
    registry = effect_registry_for_api()
    pop = next(entry for entry in registry["entries"] if entry["id"] == "pop")
    burst = next(entry for entry in registry["entries"] if entry["id"] == "burst")
    assert {row["id"] for row in pop["variations"]} == {"soft-tap", "snap-back", "bubble-pop"}
    assert {row["id"] for row in burst["variations"]} == {"pulse", "solar-flare", "rippler"}
    assert pop["default_variation_id"] == "soft-tap"
    assert burst["default_variation_id"] == "pulse"
    snap = next(row for row in pop["variations"] if row["id"] == "snap-back")
    assert snap["preview_identity"]["choreographyAnchors"]["glyphLockIn"] == 0.48


def test_consumer_render_payload_includes_pop_burst_variation() -> None:
    seed = next(h for h in load_lcard_hail_seed() if h.get("id") == "hail.spoon_transporter.001")
    pop_seed = {
        **seed,
        "visual": {
            **seed["visual"],
            "effect_id": "pop",
            "effect_variation_id": "bubble-pop",
        },
    }
    pop_payload = build_consumer_render_payload(pop_seed)
    assert pop_payload["effect_variation_id"] == "bubble-pop"
    assert pop_payload["effect_variation"]["label"] == "Bubble Pop"
    assert pop_payload["effect_variation"]["recommended_palette_id"] == "transporter_white"

    burst_seed = {
        **seed,
        "visual": {
            **seed["visual"],
            "effect_id": "burst",
            "effect_variation_id": "pulse",
        },
    }
    burst_payload = build_consumer_render_payload(burst_seed)
    assert burst_payload["effect_variation_id"] == "pulse"
    assert burst_payload["effect_identity"]["field_style"] == "radial_bloom"


def test_consumer_render_payload_includes_effect_variation() -> None:
    seed = load_lcard_hail_seed()[0]
    payload = build_consumer_render_payload(seed)
    assert payload["effect_variation_id"] == "spoon"
    assert payload["effect_variation"]["id"] == "spoon"
    assert payload["effect_variation"]["label"] == "Spoon"
    assert payload["effect_variation"]["recommended_palette_id"] == "transporter_spoon"

    spoon_seed = {
        **seed,
        "visual": {
            **seed["visual"],
            "effect_variation_id": "spoon",
            "palette_id": "transporter_spoon",
        },
    }
    spoon_payload = build_consumer_render_payload(spoon_seed)
    assert spoon_payload["effect_variation_id"] == "spoon"
    assert spoon_payload["effect_identity"]["particle_style"] == "scanfall_dense"


def test_transporter_android_tuning_subset_excludes_preview_only_keys() -> None:
    tuning = {
        "beam_intensity": 0.9,
        "beam_shape": "shimmer",
        "beam_scale": 1.1,
        "beam_color_emphasis": 0.7,
    }
    subset = android_effect_tuning_subset("transporter", tuning)
    assert subset == {"beam_intensity": 0.9, "beam_scale": 1.1}


def test_pop_defaults_refined_phase_d() -> None:
    normalized = normalize_effect_tuning("pop", None)
    assert normalized["pop_impact"] == 0.82
    assert normalized["spark_density"] == 0.35


def test_derive_preview_warns_for_preview_only_effects() -> None:
    from hails.hails_preview import derive_hail_management_preview

    seed = next(h for h in load_lcard_hail_seed() if h.get("id") == "hail.spoon_transporter.001")
    draft = {**seed, "visual": {**seed["visual"], "effect_id": "pop"}}
    result = derive_hail_management_preview(draft)
    warnings = result["validation"]["warnings"]
    assert any("google tv" in w["message"].lower() for w in warnings)


def test_contract_payload_fields_include_size_tier_semantics() -> None:
    doc = load_hail_render_contract()
    fields = doc["payloadFields"]
    assert "size_tier" in fields
    assert "size_code" in fields
    assert fields.index("size_tier") < fields.index("size_code")


def test_api_render_payload_exposes_size_tier_for_seed(tmp_path, monkeypatch) -> None:
    client = _client(tmp_path, monkeypatch)
    r = client.get("/api/hails/hail.spoon_transporter.001/render-payload")
    assert r.status_code == 200
    payload = r.json()
    assert payload["size_tier"] == "medium"
    assert payload["size_code"] == "M"

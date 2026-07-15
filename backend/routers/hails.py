"""Hails routes: hail catalog CRUD, glyph registry/plot/workbench, composer,
effect presets, render contract, presentation assets."""

from __future__ import annotations

from pathlib import Path
from typing import Any

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse, JSONResponse, Response

from axiom_settings_store import patch_settings, read_settings
from hails.glyph_generation_workbench import (
    WorkbenchValidationError,
    accept_workbench_candidate,
    archive_brief,
    clear_workbench_candidate,
    create_brief,
    reject_workbench_candidate,
    resolve_workbench_briefs,
    update_brief,
    update_workbench_candidate,
    validate_workbench_seed,
    workbench_state_from_settings,
    workbench_summary,
)
from hails.glyph_promotions import (
    PromotionValidationError,
    apply_glyph_staged_promotion,
    glyph_staged_promotions_from_settings,
    promote_workbench_candidate,
)
from hails.glyph_registry import (
    glyph_registry_summary,
    load_glyph_registry,
    registry_entries,
    registry_selector_entries,
    validate_glyph_registry,
    validate_registry_contract_alignment,
)
from hails.hail_delivery import send_hail_package
from hails.hail_effect_presets_library import (
    custom_effect_presets_from_settings,
    delete_custom_effect_preset,
    effect_preset_overrides_from_settings,
    merged_effect_presets,
    register_custom_effect_preset,
    reset_gallery_effect_preset,
    save_effect_preset,
)
from hails.hail_effects_gallery import effects_gallery_summary
from hails.hails_composer import (
    ComposerValidationError,
    custom_glyphs_from_settings,
    effective_hail_glyph_allowlist,
    effective_hail_glyph_allowlist_for_custom,
    merge_custom_glyph_overlays,
    merge_glyph_catalog,
    patch_custom_glyph,
    register_custom_glyph,
    seed_glyph_spec,
    validate_glyph_hero_quality,
    materialize_orphan_companion_hails,
)
from hails.hails_consumer_capability import load_consumer_capability_manifest
from hails.hails_domain import (
    KNOWN_CATEGORIES,
    KNOWN_PALETTE_IDS,
    KNOWN_PLACEMENT_IDS,
    KNOWN_ROOM_IDS as HAIL_KNOWN_ROOM_IDS,
    KNOWN_SIZE_TIERS,
    HailValidationError,
    archive_hail,
    create_hail,
    delete_hail,
    resolve_hails_with_source,
    restore_hail,
    update_hail,
)
from hails.hails_message_sidekick import message_registry_for_api
from hails.hails_preview import derive_hail_management_preview
from hails.hails_render_contract import (
    active_effect_ids,
    build_consumer_render_payload,
    effect_registry_for_api,
    render_contract_summary,
)
from settings import settings

router = APIRouter()


def _persist_hails_catalog(path: Path, hails: list[dict[str, Any]]) -> None:
    patch_settings(path, {"hails": hails, "hails_catalog_materialized": True})


def _hail_validation_response(exc: HailValidationError) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content={"detail": {"validation_errors": exc.errors}},
    )


def _workbench_validation_response(exc: WorkbenchValidationError) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content={"detail": {"validation_errors": exc.errors}},
    )


def _persist_workbench_briefs(briefs: list[dict]) -> None:
    patch_settings(settings.settings_path, {"glyph_generation_workbench": {"briefs": briefs}})


def _persist_glyph_staged_promotions(promotions: dict[str, dict]) -> None:
    patch_settings(settings.settings_path, {"glyph_staged_promotions": promotions})


def _composer_validation_response(exc: ComposerValidationError) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content={"detail": {"validation_errors": exc.errors}},
    )


def _glyph_allowlist(st) -> tuple[str, ...]:
    return effective_hail_glyph_allowlist(st)


@router.get("/api/hails")
async def list_hails() -> dict:
    st = read_settings(settings.settings_path)
    hails, source = resolve_hails_with_source(st)
    catalog = merge_glyph_catalog(st, registry_selector_entries())
    allowlist = _glyph_allowlist(st)
    custom = custom_glyphs_from_settings(st)
    from hails.hail_package_v2 import project_hail_stale_components

    projected_hails = [
        project_hail_stale_components(hail, custom_glyphs=custom) for hail in hails
    ]
    return {
        "hails": projected_hails,
        "source": source,
        "known_rooms": list(HAIL_KNOWN_ROOM_IDS),
        "known_glyphs": list(allowlist),
        "known_categories": list(KNOWN_CATEGORIES),
        "known_effects": list(active_effect_ids()),
        "effect_registry": effect_registry_for_api(),
        "message_registry": message_registry_for_api(),
        "known_size_tiers": list(KNOWN_SIZE_TIERS),
        "known_palette_ids": list(KNOWN_PALETTE_IDS),
        "known_placement_ids": list(KNOWN_PLACEMENT_IDS),
        "render_contract": render_contract_summary(),
        "glyph_registry": glyph_registry_summary(),
        "glyph_catalog": catalog,
        "custom_glyphs": list(custom_glyphs_from_settings(st).values()),
        "effects_gallery": effects_gallery_summary(),
        "effect_presets": merged_effect_presets(st),
    }


@router.get("/api/hails/glyph-registry")
async def get_hail_glyph_registry() -> dict:
    doc = load_glyph_registry()
    errors = validate_glyph_registry(doc)
    alignment = validate_registry_contract_alignment(doc=doc)
    return {
        "summary": glyph_registry_summary(doc),
        "glyphs": registry_selector_entries(doc),
        "entries": registry_entries(doc),
        "validation_errors": errors + alignment,
    }


@router.get("/api/hails/glyph-plot/fixtures")
async def list_glyph_plot_fixtures() -> dict:
    from hails.glyph_plot_store import list_plot_fixture_ids, plot_fixture_summary

    ids = list_plot_fixture_ids()
    return {
        "fixtures": [plot_fixture_summary(plot_id) for plot_id in ids],
        "plot_surface": "#/axiom/hails/plot",
    }


@router.get("/api/hails/glyph-plot/fixtures/{plot_id}")
async def get_glyph_plot_fixture(plot_id: str) -> dict:
    from hails.glyph_plot_store import plot_fixture_detail

    try:
        return plot_fixture_detail(plot_id)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Unknown plot fixture: {plot_id}")


@router.put("/api/hails/glyph-plot/fixtures/{plot_id}")
async def put_glyph_plot_fixture(plot_id: str, body: dict) -> dict:
    from hails.glyph_plot_store import save_plot_fixture

    try:
        return save_plot_fixture(plot_id, body)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Unknown plot fixture: {plot_id}")
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))


@router.post("/api/hails/glyph-plot/fixtures/{plot_id}/import-svg")
async def post_glyph_plot_import_svg(
    plot_id: str,
    file: UploadFile = File(...),
    normalize: bool = Form(True),
) -> dict:
    from hails.glyph_plot_import import import_authored_svg_for_plot
    from hails.glyph_svg_normalize import SvgNormalizeError

    raw = await file.read()
    try:
        svg_text = raw.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise HTTPException(status_code=400, detail="SVG must be UTF-8 text") from exc
    if not svg_text.strip():
        raise HTTPException(status_code=400, detail="Empty SVG upload")
    try:
        return import_authored_svg_for_plot(plot_id, svg_text, normalize=normalize)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Unknown plot fixture: {plot_id}")
    except SvgNormalizeError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))


@router.post("/api/hails/glyph-plot/fixtures/{plot_id}/retrace-reference")
async def post_glyph_plot_retrace_reference(plot_id: str) -> dict:
    from hails.glyph_combadge_reference_trace import CombadgeTraceError, retrace_combadge_plot_from_reference

    if plot_id != "custom-combadge-plot":
        raise HTTPException(
            status_code=422,
            detail="retrace-reference is only supported for custom-combadge-plot",
        )
    try:
        return retrace_combadge_plot_from_reference()
    except CombadgeTraceError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Unknown plot fixture: {plot_id}")
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))


@router.get("/api/hails/glyph-plot/fixtures/{plot_id}/strip.svg")
async def get_glyph_plot_fixture_strip(plot_id: str) -> Response:
    from hails.glyph_plot_store import plot_fixture_strip_svg

    try:
        svg = plot_fixture_strip_svg(plot_id)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Unknown plot fixture: {plot_id}")
    return Response(content=svg, media_type="image/svg+xml")


@router.get("/api/hails/glyph-plot/fixtures/{plot_id}/reference.png")
async def get_glyph_plot_fixture_reference(plot_id: str) -> FileResponse:
    from hails.glyph_plot_store import plot_fixture_reference_path

    try:
        path = plot_fixture_reference_path(plot_id)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Unknown plot reference: {plot_id}")
    return FileResponse(path, media_type="image/png")


@router.get("/api/hails/glyph-images/{glyph_id}.png")
async def get_glyph_image_asset(glyph_id: str) -> FileResponse:
    from hails.hail_glyph_image_asset import media_type_for_image_path, resolve_glyph_image_path

    st = read_settings(settings.settings_path)
    needle = glyph_id if glyph_id.startswith("custom-") else f"custom-{glyph_id}"
    spec = custom_glyphs_from_settings(st).get(needle)
    image_asset = spec.get("image_asset") if isinstance(spec, dict) and isinstance(spec.get("image_asset"), dict) else None
    asset_path = str(image_asset.get("path") or "").strip() if image_asset else ""
    if not asset_path:
        raise HTTPException(status_code=404, detail=f"No image asset for glyph: {glyph_id}")
    try:
        path = resolve_glyph_image_path(asset_path)
    except (FileNotFoundError, ValueError):
        raise HTTPException(status_code=404, detail=f"Image asset missing on disk: {glyph_id}")
    return FileResponse(path, media_type=media_type_for_image_path(path))


@router.get("/api/hails/glyph-hero-images/{asset_path:path}")
async def get_glyph_hero_image_by_path(asset_path: str) -> FileResponse:
    from hails.hail_glyph_image_asset import media_type_for_image_path, resolve_glyph_image_path

    if ".." in asset_path.split("/"):
        raise HTTPException(status_code=404, detail="Not found")
    try:
        path = resolve_glyph_image_path(asset_path)
    except (FileNotFoundError, ValueError):
        raise HTTPException(status_code=404, detail="Not found")
    return FileResponse(path, media_type=media_type_for_image_path(path))


@router.get("/api/hails/presentation-assets/{asset_path:path}")
async def get_presentation_asset(asset_path: str) -> FileResponse:
    from settings import _resolve_repo_root

    if ".." in asset_path.split("/"):
        raise HTTPException(status_code=404, detail="Not found")
    allowed_prefixes = ("presentation-templates/", "presentation-overlays/")
    if not any(asset_path.startswith(prefix) for prefix in allowed_prefixes):
        raise HTTPException(status_code=404, detail="Not found")
    repo = _resolve_repo_root()
    candidate = (repo / "config/hails" / asset_path).resolve()
    try:
        candidate.relative_to((repo / "config/hails").resolve())
    except ValueError:
        raise HTTPException(status_code=404, detail="Not found")
    if not candidate.is_file():
        raise HTTPException(status_code=404, detail="Not found")
    suffix = candidate.suffix.lower()
    if suffix == ".png":
        media = "image/png"
    elif suffix == ".json":
        media = "application/json"
    elif suffix == ".webp":
        media = "image/webp"
    else:
        media = "application/octet-stream"
    return FileResponse(candidate, media_type=media)


@router.get("/api/hails/presentation-templates")
async def list_presentation_templates_api() -> dict:
    from hails.hail_presentation_template import list_presentation_template_ids

    return {"template_ids": list_presentation_template_ids()}


@router.get("/api/hails/glyph-generation-workbench")
async def get_glyph_generation_workbench() -> dict:
    st = read_settings(settings.settings_path)
    briefs, source = resolve_workbench_briefs(workbench_state_from_settings(st))
    registry = load_glyph_registry()
    return {
        "summary": workbench_summary(briefs),
        "source": source,
        "briefs": briefs,
        "staged_promotions": glyph_staged_promotions_from_settings(st),
        "registry_summary": glyph_registry_summary(registry),
        "registry_glyphs": registry_entries(registry),
        "seed_validation_errors": validate_workbench_seed(),
        "safety_notice": (
            "Prepare generation briefs, stage asset refs under staged/glyphs/, accept candidates, "
            "then promote to record operator-approved staged bindings. Promotion does not replace "
            "committed registry JSON or Android/LCARD production assets."
        ),
    }


@router.post("/api/hails/glyph-generation-workbench/briefs")
async def create_glyph_generation_brief(body: dict) -> Any:
    if not isinstance(body, dict):
        raise HTTPException(status_code=400, detail="JSON object body required")
    st = read_settings(settings.settings_path)
    briefs, _source = resolve_workbench_briefs(workbench_state_from_settings(st))
    try:
        created = create_brief(body, briefs)
    except WorkbenchValidationError as exc:
        return _workbench_validation_response(exc)
    _persist_workbench_briefs([*briefs, created])
    return created


@router.put("/api/hails/glyph-generation-workbench/briefs/{brief_id}")
async def update_glyph_generation_brief(brief_id: str, body: dict) -> Any:
    if not isinstance(body, dict):
        raise HTTPException(status_code=400, detail="JSON object body required")
    st = read_settings(settings.settings_path)
    briefs, _source = resolve_workbench_briefs(workbench_state_from_settings(st))
    try:
        updated = update_brief(brief_id, body, briefs)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Unknown brief id: {brief_id}")
    except WorkbenchValidationError as exc:
        return _workbench_validation_response(exc)
    next_briefs = [updated if (b.get("brief_id") or "").strip() == brief_id else b for b in briefs]
    _persist_workbench_briefs(next_briefs)
    return updated


@router.post("/api/hails/glyph-generation-workbench/briefs/{brief_id}/archive")
async def archive_glyph_generation_brief(brief_id: str) -> dict:
    st = read_settings(settings.settings_path)
    briefs, _source = resolve_workbench_briefs(workbench_state_from_settings(st))
    try:
        archived = archive_brief(brief_id, briefs)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Unknown brief id: {brief_id}")
    except WorkbenchValidationError as exc:
        return _workbench_validation_response(exc)
    next_briefs = [archived if (b.get("brief_id") or "").strip() == brief_id else b for b in briefs]
    _persist_workbench_briefs(next_briefs)
    return {"ok": True, "brief": archived}


@router.put("/api/hails/glyph-generation-workbench/briefs/{brief_id}/candidates/{candidate_id}")
async def update_glyph_workbench_candidate(brief_id: str, candidate_id: str, body: dict) -> Any:
    if not isinstance(body, dict):
        raise HTTPException(status_code=400, detail="JSON object body required")
    st = read_settings(settings.settings_path)
    briefs, _source = resolve_workbench_briefs(workbench_state_from_settings(st))
    try:
        updated = update_workbench_candidate(brief_id, candidate_id, body, briefs)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Unknown brief or candidate id: {brief_id}/{candidate_id}")
    except WorkbenchValidationError as exc:
        return _workbench_validation_response(exc)
    next_briefs = [updated if (b.get("brief_id") or "").strip() == brief_id else b for b in briefs]
    _persist_workbench_briefs(next_briefs)
    return updated


@router.post("/api/hails/glyph-generation-workbench/briefs/{brief_id}/candidates/{candidate_id}/clear")
async def clear_glyph_workbench_candidate(brief_id: str, candidate_id: str) -> Any:
    st = read_settings(settings.settings_path)
    briefs, _source = resolve_workbench_briefs(workbench_state_from_settings(st))
    try:
        updated = clear_workbench_candidate(brief_id, candidate_id, briefs)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Unknown brief or candidate id: {brief_id}/{candidate_id}")
    except WorkbenchValidationError as exc:
        return _workbench_validation_response(exc)
    next_briefs = [updated if (b.get("brief_id") or "").strip() == brief_id else b for b in briefs]
    _persist_workbench_briefs(next_briefs)
    return updated


@router.post("/api/hails/glyph-generation-workbench/briefs/{brief_id}/candidates/{candidate_id}/accept")
async def accept_glyph_workbench_candidate(brief_id: str, candidate_id: str, body: dict | None = None) -> Any:
    notes = None
    if isinstance(body, dict) and "notes" in body:
        notes = body.get("notes")
    st = read_settings(settings.settings_path)
    briefs, _source = resolve_workbench_briefs(workbench_state_from_settings(st))
    try:
        updated = accept_workbench_candidate(brief_id, candidate_id, briefs, notes=notes)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Unknown brief or candidate id: {brief_id}/{candidate_id}")
    except WorkbenchValidationError as exc:
        return _workbench_validation_response(exc)
    next_briefs = [updated if (b.get("brief_id") or "").strip() == brief_id else b for b in briefs]
    _persist_workbench_briefs(next_briefs)
    return updated


@router.post("/api/hails/glyph-generation-workbench/briefs/{brief_id}/candidates/{candidate_id}/reject")
async def reject_glyph_workbench_candidate(brief_id: str, candidate_id: str, body: dict | None = None) -> Any:
    notes = None
    if isinstance(body, dict) and "notes" in body:
        notes = body.get("notes")
    st = read_settings(settings.settings_path)
    briefs, _source = resolve_workbench_briefs(workbench_state_from_settings(st))
    try:
        updated = reject_workbench_candidate(brief_id, candidate_id, briefs, notes=notes)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Unknown brief or candidate id: {brief_id}/{candidate_id}")
    except WorkbenchValidationError as exc:
        return _workbench_validation_response(exc)
    next_briefs = [updated if (b.get("brief_id") or "").strip() == brief_id else b for b in briefs]
    _persist_workbench_briefs(next_briefs)
    return updated


@router.post("/api/hails/glyph-generation-workbench/briefs/{brief_id}/candidates/{candidate_id}/promote")
async def promote_glyph_workbench_candidate_route(brief_id: str, candidate_id: str) -> Any:
    st = read_settings(settings.settings_path)
    briefs, _source = resolve_workbench_briefs(workbench_state_from_settings(st))
    try:
        updated, promotion = promote_workbench_candidate(brief_id, candidate_id, briefs)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Unknown brief or candidate id: {brief_id}/{candidate_id}")
    except (WorkbenchValidationError, PromotionValidationError) as exc:
        return _workbench_validation_response(exc)
    next_briefs = [updated if (b.get("brief_id") or "").strip() == brief_id else b for b in briefs]
    promotions = apply_glyph_staged_promotion(glyph_staged_promotions_from_settings(st), promotion)
    _persist_workbench_briefs(next_briefs)
    _persist_glyph_staged_promotions(promotions)
    return {"brief": updated, "promotion": promotion}


@router.post("/api/hails/glyph-generation-workbench/promote-staged-glyph")
async def promote_staged_glyph_to_plot_route(body: dict) -> Any:
    from hails.glyph_staging_import import StagingImportError, promote_staged_glyph_to_plot

    asset_ref = (body or {}).get("asset_ref") if isinstance(body, dict) else None
    recipe_id = (body or {}).get("recipe_id") if isinstance(body, dict) else None
    plot_id = (body or {}).get("plot_id") if isinstance(body, dict) else None
    if not asset_ref or not recipe_id:
        raise HTTPException(status_code=422, detail="asset_ref and recipe_id required")
    try:
        detail = promote_staged_glyph_to_plot(
            asset_ref=str(asset_ref),
            recipe_id=str(recipe_id),
            plot_id=str(plot_id).strip() if plot_id else None,
        )
    except StagingImportError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    return {"plot_id": detail.get("plot_id"), "fixture": detail}


@router.post("/api/hails/derive-preview")
async def derive_hail_preview(body: dict) -> Any:
    if not isinstance(body, dict):
        raise HTTPException(status_code=400, detail="JSON object body required")
    record = body.get("record") if isinstance(body.get("record"), dict) else body
    hail_id = (body.get("hail_id") or record.get("id") or "").strip()
    st = read_settings(settings.settings_path)
    custom_glyphs = merge_custom_glyph_overlays(
        custom_glyphs_from_settings(st),
        body.get("custom_glyphs"),
    )
    glyph_allowlist = effective_hail_glyph_allowlist_for_custom(custom_glyphs)
    previous = None
    if hail_id:
        hails, _source = resolve_hails_with_source(st)
        previous = next((h for h in hails if (h.get("id") or "").strip() == hail_id), None)
    return derive_hail_management_preview(
        record,
        previous=previous,
        glyph_allowlist=glyph_allowlist,
        custom_glyphs=custom_glyphs,
    )


@router.get("/api/hails/render-contract")
async def get_hail_render_contract(generation: str | None = None) -> dict:
    from hails.hails_render_contract import load_hail_render_contract_for_generation

    contract = load_hail_render_contract_for_generation(generation)
    return {
        "summary": render_contract_summary(contract),
        "contract": contract,
        "effect_registry": effect_registry_for_api(contract),
        "message_registry": message_registry_for_api(contract),
        "generation": contract.get("version"),
    }


@router.get("/api/hails/{hail_id}/render-payload")
async def get_hail_render_payload(hail_id: str) -> Any:
    st = read_settings(settings.settings_path)
    hails, _source = resolve_hails_with_source(st)
    record = next((h for h in hails if (h.get("id") or "").strip() == hail_id), None)
    if record is None:
        raise HTTPException(status_code=404, detail=f"Unknown hail id: {hail_id}")
    return build_consumer_render_payload(record, custom_glyphs=custom_glyphs_from_settings(st))


@router.get("/api/hails/{hail_id}/chip-glyph-thumb")
async def get_hail_chip_glyph_thumb(hail_id: str) -> Response:
    from hails.hail_lcard_catalog import render_chip_glyph_thumb_svg
    from hails.hails_glyph_render import resolve_glyph_render

    st = read_settings(settings.settings_path)
    hails, _source = resolve_hails_with_source(st)
    record = next((h for h in hails if (h.get("id") or "").strip() == hail_id), None)
    if record is None:
        raise HTTPException(status_code=404, detail=f"Unknown hail id: {hail_id}")
    icon = record.get("icon") if isinstance(record.get("icon"), dict) else {}
    glyph_id = str(icon.get("value") or "default")
    custom_glyphs = custom_glyphs_from_settings(st)
    glyph_render = resolve_glyph_render(glyph_id, custom_glyphs=custom_glyphs)
    procedural_graph = (
        glyph_render.get("procedural_graph")
        if isinstance(glyph_render.get("procedural_graph"), dict)
        else None
    )
    svg = render_chip_glyph_thumb_svg(
        glyph_id=glyph_id,
        hail_name=str(record.get("name") or ""),
        procedural_graph=procedural_graph,
    )
    return Response(content=svg, media_type="image/svg+xml")


@router.get("/api/hails/consumer-capability-manifest")
async def get_consumer_capability_manifest() -> dict:
    return load_consumer_capability_manifest()


@router.post("/api/hails/{hail_id}/send")
async def send_hail_endpoint(hail_id: str, body: dict | None = None) -> Any:
    payload_body = body if isinstance(body, dict) else {}
    st = read_settings(settings.settings_path)
    hails, _source = resolve_hails_with_source(st)
    record = next((h for h in hails if (h.get("id") or "").strip() == hail_id), None)
    if record is None:
        raise HTTPException(status_code=404, detail=f"Unknown hail id: {hail_id}")
    if record.get("archived") is True:
        return JSONResponse(
            status_code=400,
            content={"ok": False, "code": "HAIL_ARCHIVED", "error": "Archived hails cannot be sent"},
        )
    if record.get("enabled") is False:
        return JSONResponse(
            status_code=400,
            content={"ok": False, "code": "HAIL_DISABLED", "error": "Disabled hails cannot be sent"},
        )
    package = build_consumer_render_payload(record, custom_glyphs=custom_glyphs_from_settings(st))
    delivery_target_id = payload_body.get("delivery_target_id")
    source = str(payload_body.get("source") or "proscenium")
    result = send_hail_package(
        package,
        delivery_target_id=str(delivery_target_id).strip() if delivery_target_id else None,
        source=source,
    )
    status = int(result.get("status") or 500)
    if result.get("ok"):
        return result
    return JSONResponse(status_code=status, content=result)


@router.post("/api/hails/composer/seed-glyph")
async def composer_seed_glyph(body: dict) -> dict:
    if not isinstance(body, dict):
        raise HTTPException(status_code=400, detail="JSON object body required")
    st = read_settings(settings.settings_path)
    existing = set(effective_hail_glyph_allowlist(st))
    seed_val = body.get("seed")
    try:
        seed_int = int(seed_val) if seed_val is not None else None
    except (TypeError, ValueError):
        seed_int = None
    try:
        spec = seed_glyph_spec(
            glyph_name=str(body.get("glyph_name") or ""),
            hail_name=str(body.get("hail_name") or ""),
            seed=seed_int,
            scale=str(body.get("scale") or "") or None,
            palette_id=str(body.get("palette_id") or "") or None,
            effect_id=str(body.get("effect_id") or "") or None,
            existing_ids=existing,
            glyph_family_id=str(body.get("glyph_family_id") or "").strip() or None,
            variation_only=body.get("variation_only") is True,
            remix=body.get("remix") is True,
            glyph_id=str(body.get("glyph_id") or "").strip() or None,
        )
    except ComposerValidationError as exc:
        return _composer_validation_response(exc)
    return spec


@router.post("/api/hails/composer/validate-glyph-hero")
async def composer_validate_glyph_hero(body: dict) -> dict:
    if not isinstance(body, dict):
        raise HTTPException(status_code=400, detail="JSON object body required")
    return validate_glyph_hero_quality(body)


@router.post("/api/hails/composer/register-glyph")
async def composer_register_glyph(body: dict) -> dict:
    if not isinstance(body, dict):
        raise HTTPException(status_code=400, detail="JSON object body required")
    st = read_settings(settings.settings_path)
    try:
        registered = register_custom_glyph(st, body)
    except ComposerValidationError as exc:
        return _composer_validation_response(exc)
    glyphs = custom_glyphs_from_settings(st)
    glyphs[registered["glyph_id"]] = registered
    st.custom_glyphs = glyphs
    materialize_orphan_companion_hails(st, glyph_allowlist=_glyph_allowlist(st))
    patch_settings(
        settings.settings_path,
        {
            "custom_glyphs": glyphs,
            "hails": st.hails,
            "hails_catalog_materialized": st.hails_catalog_materialized,
        },
    )
    return registered


@router.patch("/api/hails/composer/custom-glyphs/{glyph_id}")
async def composer_patch_custom_glyph(glyph_id: str, body: dict) -> dict:
    if not isinstance(body, dict):
        raise HTTPException(status_code=400, detail="JSON object body required")
    st = read_settings(settings.settings_path)
    try:
        updated = patch_custom_glyph(st, glyph_id, body)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Unknown custom glyph: {glyph_id}")
    except ComposerValidationError as exc:
        return _composer_validation_response(exc)
    glyphs = custom_glyphs_from_settings(st)
    glyphs[updated["glyph_id"]] = updated
    patch_settings(settings.settings_path, {"custom_glyphs": glyphs})
    return updated


def _persist_effect_preset_settings(st) -> None:
    patch_settings(
        settings.settings_path,
        {
            "custom_effect_presets": custom_effect_presets_from_settings(st),
            "effect_preset_overrides": effect_preset_overrides_from_settings(st),
        },
    )


@router.post("/api/hails/composer/effect-presets")
async def composer_register_effect_preset(body: dict) -> dict:
    if not isinstance(body, dict):
        raise HTTPException(status_code=400, detail="JSON object body required")
    st = read_settings(settings.settings_path)
    try:
        registered = register_custom_effect_preset(st, body)
    except ComposerValidationError as exc:
        return _composer_validation_response(exc)
    _persist_effect_preset_settings(st)
    return registered


@router.put("/api/hails/composer/effect-presets/{preset_id}")
async def composer_save_effect_preset(preset_id: str, body: dict) -> dict:
    if not isinstance(body, dict):
        raise HTTPException(status_code=400, detail="JSON object body required")
    st = read_settings(settings.settings_path)
    try:
        saved = save_effect_preset(st, preset_id, body)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Unknown effect preset: {preset_id}")
    except ComposerValidationError as exc:
        return _composer_validation_response(exc)
    _persist_effect_preset_settings(st)
    return saved


@router.delete("/api/hails/composer/effect-presets/{preset_id}")
async def composer_delete_effect_preset(preset_id: str) -> dict:
    st = read_settings(settings.settings_path)
    try:
        delete_custom_effect_preset(st, preset_id)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Unknown custom effect preset: {preset_id}")
    except ComposerValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc.args[0]) if exc.args else "validation failed") from exc
    _persist_effect_preset_settings(st)
    return {"deleted": preset_id}


@router.post("/api/hails/composer/effect-presets/{preset_id}/reset")
async def composer_reset_effect_preset(preset_id: str) -> dict:
    st = read_settings(settings.settings_path)
    try:
        restored = reset_gallery_effect_preset(st, preset_id)
    except ComposerValidationError as exc:
        return _composer_validation_response(exc)
    _persist_effect_preset_settings(st)
    return restored


@router.post("/api/hails")
async def create_hail_endpoint(body: dict) -> Any:
    if not isinstance(body, dict):
        raise HTTPException(status_code=400, detail="JSON object body required")
    st = read_settings(settings.settings_path)
    hails, _source = resolve_hails_with_source(st)
    allowlist = _glyph_allowlist(st)
    try:
        created = create_hail(
            body,
            hails,
            glyph_allowlist=allowlist,
            custom_glyphs=custom_glyphs_from_settings(st),
        )
    except HailValidationError as exc:
        return _hail_validation_response(exc)
    _persist_hails_catalog(settings.settings_path, [*hails, created])
    return created


@router.put("/api/hails/{hail_id}")
async def update_hail_endpoint(hail_id: str, body: dict) -> Any:
    if not isinstance(body, dict):
        raise HTTPException(status_code=400, detail="JSON object body required")
    st = read_settings(settings.settings_path)
    hails, _source = resolve_hails_with_source(st)
    allowlist = _glyph_allowlist(st)
    try:
        updated = update_hail(
            hail_id,
            body,
            hails,
            glyph_allowlist=allowlist,
            custom_glyphs=custom_glyphs_from_settings(st),
        )
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Unknown hail id: {hail_id}")
    except HailValidationError as exc:
        return _hail_validation_response(exc)
    next_hails = [updated if (h.get("id") or "").strip() == hail_id else h for h in hails]
    _persist_hails_catalog(settings.settings_path, next_hails)
    return updated


@router.post("/api/hails/{hail_id}/archive")
async def archive_hail_endpoint(hail_id: str) -> dict:
    st = read_settings(settings.settings_path)
    hails, _source = resolve_hails_with_source(st)
    try:
        archived = archive_hail(hail_id, hails)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Unknown hail id: {hail_id}")
    next_hails = [archived if (h.get("id") or "").strip() == hail_id else h for h in hails]
    _persist_hails_catalog(settings.settings_path, next_hails)
    return {"ok": True, "hail": archived}


@router.post("/api/hails/{hail_id}/restore")
async def restore_hail_endpoint(hail_id: str) -> dict:
    st = read_settings(settings.settings_path)
    hails, _source = resolve_hails_with_source(st)
    try:
        restored = restore_hail(hail_id, hails, glyph_allowlist=_glyph_allowlist(st))
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Unknown hail id: {hail_id}")
    except HailValidationError as exc:
        return _hail_validation_response(exc)
    next_hails = [restored if (h.get("id") or "").strip() == hail_id else h for h in hails]
    _persist_hails_catalog(settings.settings_path, next_hails)
    return {"ok": True, "hail": restored}


@router.delete("/api/hails/{hail_id}")
async def delete_hail_endpoint(hail_id: str) -> dict:
    st = read_settings(settings.settings_path)
    hails, _source = resolve_hails_with_source(st)
    try:
        delete_hail(hail_id, hails)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Unknown hail id: {hail_id}")
    next_hails = [h for h in hails if (h.get("id") or "").strip() != hail_id]
    _persist_hails_catalog(settings.settings_path, next_hails)
    return {"ok": True, "deleted_id": hail_id}

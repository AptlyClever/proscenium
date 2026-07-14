# Hails Runtime Readiness Audit v001

Static inspection of the Axiom Hail contract after Composer, Glyph library, Effects Gallery, and Paintbox Preview work (issue #113).

**Verdict: conditional** — core hail persistence and consumer render projection are ready; controlled proof requires explicit prerequisites for new hails and known motion/preset gaps.

This document is inspection-only. No deployment, runtime validation, or visual proof.

## Audited surfaces

| Area | Primary sources |
| --- | --- |
| Composer create/edit bodies | `frontend/src/hailGlyphComposer.ts` |
| Domain merge & validation | `backend/hails_domain.py` |
| Custom glyphs | `backend/hails_composer.py`, settings `custom_glyphs` |
| Effect presets | `config/hails/hail-effects-gallery.v001.json`, `backend/hail_effects_gallery.py` |
| Consumer render payload | `backend/hails_render_contract.py` |
| LCARD effective handoff | `backend/central_settings.py` → `GET /api/effective/lcard` |
| Readiness metadata | `config/lcard/hail-route-readiness.json`, `config/lcard/hail-renderer-readiness.json` |
| Preview (local only) | `frontend/src/hailPaintboxPreviewEffects.ts` |

## Saved Hail payload (Composer create)

`hailBodyFromComposer` sends:

| Field | Present | Notes |
| --- | --- | --- |
| `name` | ✓ | Required |
| `category` | ✓ | Default `cute` |
| `enabled` | ✓ | Default `true` |
| `message.short_text` | ✓ | |
| `icon.kind` / `icon.value` | ✓ | Glyph ID (registry or `custom-*`) |
| `visual.effect_id` | ✓ | Allowlisted |
| `visual.scale` | ✓ | Size tier |
| `visual.palette_id` | ✓ | |
| `visual.duration_ms` | ✓ | |
| `visual.placement_id` / `placement_mode` | ✓ | Composer uses preset placement |
| `delivery_policy.routes[]` | ✓ | Single enabled route |
| `rooms.badge_policy` | ✓ | `source_room` |
| `behavior` | ✓ | Default cooldown/confirmation |

Backend `_normalized` adds: `id`, `display_id`, `schema_version`, default `visual.anchor`, `visual.reduced_motion_fallback`, `icon.label`, empty `advanced`/`audio` as applicable.

**Not sent by Composer create:** `display_id`, `advanced`, `audio`, custom placement coordinates.

## Saved Hail payload (Composer edit)

`hailBodyFromComposerEdit` sends: `name`, `enabled`, `message`, `icon`, `visual`.

Sends `delivery_policy` **only when** source/destination room changed (patches matched route).

**Preserved on edit (omitted from patch):** `behavior`, `rooms`, sibling routes, `category`, `display_id`, `advanced`, `audio`.

Covered by `test_composer_edit_patch_preserves_advanced_fields`.

## Effect Preset / Presentation Style

Applying a preset writes underlying **`visual.*` fields only**. There is **no** persisted `effect_preset_id` or `presentation_style` on hail records.

Preset metadata used for UX/preview only:

- `mood`, `reduced_motion`, `animation_enabled`, `transition_style`

Quiet Signal maps to `visual.effect_id: none` — persisted; reduced-motion flag is **not** persisted on hail.

## Custom & archived Glyphs

| Behavior | Status |
| --- | --- |
| Custom glyph IDs (`custom-*`) in `icon.value` | Valid after registration |
| Archived glyphs on allowlist | Yes — hails remain valid |
| Archived hidden from selector unless selected | Frontend only |
| Glyph `transition_style` / `animation_enabled` | Stored on glyph spec, not hail record |

## Consumer render payload (downstream read model)

`build_consumer_render_payload` projects:

`effect_id`, `glyph_id`, `palette_id`, `message`, `duration_ms`, `placement_id`, `placement_mode`, `size_tier`, lifecycle timing, etc.

**Not in consumer payload:** preset id, `transition_style`, glyph animation flags, Paintbox preview motion.

## LCARD handoff boundary

`GET /api/effective/lcard` → `app_settings.hails` from domain store when non-empty, enriched with `delivery_policy.effective_by_launch_room`.

Static readiness JSON (`hail-route-readiness.json`, `hail-renderer-readiness.json`) covers **seed hail IDs only**. Composer-created hails show "pending" readiness until manually curated.

## Controlled proof checklist

Use before any later proof attempt:

### Required (must pass)

- [ ] Target hail exists in `GET /api/hails` with expected `name`, `message.short_text`, `enabled`
- [ ] `icon.value` is on effective glyph allowlist (registry or registered custom)
- [ ] `visual.effect_id`, `scale`, `palette_id`, `duration_ms`, `placement_id` match intent
- [ ] At least one enabled `delivery_policy.routes[]` entry with expected launch/destination rooms
- [ ] `GET /api/hails/{id}/render-payload` returns consistent consumer projection
- [ ] `GET /api/effective/lcard` includes hail with `effective_by_launch_room` when routes enabled
- [ ] `POST /api/hails/derive-preview` reports `validation.valid: true`

### Optional / documented

- [ ] `visual.anchor`, `reduced_motion_fallback` — backend defaults if unset
- [ ] `behavior`, `rooms.badge_policy` — preserved on Composer edit
- [ ] Multi-route hails — Composer edits primary route only; siblings preserved

### Known gaps (document, do not assume)

- [ ] **No persisted preset identity** — compare raw `visual.*`, not preset label
- [ ] **Preview motion ≠ runtime** — `transition_style`, reduced-motion preset flags are local preview only
- [ ] **Readiness JSON** — new hails need manual entries or accept pending UI
- [ ] **Non-transporter effects** — `pop`/`burst`/`none` may produce derive-preview warnings for Android transporter path
- [ ] **Custom placement** — Composer hardcodes preset placement; custom x/y via Visual Contract editor only

## Validation failure modes

| Failure | Typical cause |
| --- | --- |
| 422 on create/update | Unknown glyph, invalid visual enum, bad route policy |
| derive-preview invalid | Unknown glyph, missing route, contract violation |
| derive-preview warnings | Effect outside production transporter path |
| Custom glyph 404 on patch | Glyph not registered |

## Readiness verdict

| Dimension | Verdict |
| --- | --- |
| Domain CRUD + merge | Ready |
| Composer edit preservation | Ready |
| Custom/archived glyph validity | Ready |
| Visual → render payload | Ready |
| Composer create full-shape persistence | Ready (guarded by audit test) |
| Effect preset → saved visual | Ready (guarded by audit test) |
| Preset/motion metadata for runtime | Not ready — deferred |
| Readiness JSON for new hails | Not ready — manual curation |
| Controlled proof | **Conditional** — proceed only with checklist above |

## Prerequisites before controlled proof

1. Select target hail(s) and confirm persisted fields via API (not Paintbox preview alone).
2. If Composer-created, add route/renderer readiness entries or accept pending status.
3. Document which `visual.*` values are proof targets (not preset names).
4. Accept that preview motion semantics may differ from runtime until a future contract extension.
5. Run derive-preview and render-payload checks as static preflight.

## Related docs

- `hails-composer-v001.md`, `hails-composer-v002-edit-existing.md`
- `custom-glyph-library-v001.md`, `hail-effects-gallery-v001.md`
- `local-paintbox-preview-richness-v001.md`
- `docs/hails-v001-integration.md`

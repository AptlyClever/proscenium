# Hail catalog and render-contract hygiene v001

**Issue:** AptlyClever/ctrl-alt-axiom#84  
**Context:** LCARD Android size-tier merge (`control-alt-lcard#180` @ `9b90e10`)  
**Date:** 2026-06-13  
**Evidence:** static docs + backend unit tests only — no deploy, no runtime validation, no visual proof

---

## Purpose

Audit Axiom Hail **catalog fields**, **render-contract fields**, and **downstream consumer expectations** after Android `size_tier` support landed in LCARD. Clarify semantics, document transporter-only Android production scope, and record gaps that need operator/design follow-up.

---

## Catalog field inventory (hail record)

Source: `config/lcard/hail-definitions.json`, domain CRUD (`backend/hails_domain.py`), effective bridge.

| Field / block | Type | Owner | In render-payload? | Downstream use |
| --- | --- | --- | --- | --- |
| `id` | string | Axiom | → `hail_id` | LCARD catalog, broker proof, Android registry |
| `name`, `category`, `display_id` | metadata | Axiom | no | Hails UI, LCARD pad |
| `enabled`, `archived` | boolean | Axiom | no | effective filter |
| `icon.kind` | enum | Axiom | no | validation |
| `icon.value` | glyph id | Axiom | → `glyph_id` | LCARD overlay, Android drawable map |
| `icon.label` | string | Axiom | no | UI only |
| `message.short_text`, `variants` | string[] | Axiom | → `message` | overlay text (variant pick at send time) |
| `rooms.*` | policy | Axiom | no | route eligibility (legacy + derived) |
| `delivery_policy.routes[]` | routes | Axiom | no | LCARD send path |
| `visual.effect_id` | named effect | Axiom | → `effect_id` (normalized) | LCARD maps `transporter` → `transporter_beam` for Android |
| `visual.palette_id` | palette | Axiom | → `palette_id` | overlay colors |
| `visual.scale` | size tier | Axiom | → `size_tier` + `size_code` | **primary catalog input** for tier |
| `visual.size_tier` | alias | Axiom | same as `scale` | accepted alias in projection |
| `visual.duration_ms` | int | Axiom | → `duration_ms` + lifecycle `stable_hold_ms` | Android lifecycle hold |
| `visual.placement_id` | preset id | Axiom | → `placement_id` | Paint Box origin |
| `visual.placement_mode` | preset/custom | Axiom | → `placement_mode` | placement resolver |
| `visual.x_percent`, `y_percent` | float | Axiom | → same | custom placement |
| `visual.anchor` | string | Axiom | no | catalog metadata (not overlay POST) |
| `visual.reduced_motion_fallback` | string | Axiom | no | future accessibility slice |
| `audio.*`, `behavior.*`, `advanced.*` | blocks | Axiom | no | not in v001 overlay path |

---

## Render-contract field inventory

Source: `config/hails/hail-render-contract.v001.json`, `backend/hails_render_contract.py`.

### Consumer render-payload (`GET /api/hails/{id}/render-payload`)

| Field | Source | Semantics |
| --- | --- | --- |
| `hail_id` | record `id` | canonical hail id |
| `effect_id` | `visual.effect_id` (normalized) | named effect: `none`, `pop`, `burst`, `transporter` |
| `glyph_id` | `icon.value` | allowlist: `default`, `default`, `default` |
| `palette_id` | `visual.palette_id` | palette roles in contract JSON |
| `message` | `message.short_text` | plain text, max 120 |
| `duration_ms` | `visual.duration_ms` | **stable hold only** |
| `placement_id`, `placement_mode`, `x_percent`, `y_percent` | `visual.*` | Paint Box placement |
| `size_tier` | `normalize(visual.scale \| visual.size_tier)` | `small` \| `medium` \| `large` |
| `size_code` | derived from tier | `S` \| `M` \| `L` |
| `lifecycle_timing` | effect + duration | entrance / stable / exit ms |
| `effect_identity` | named effect entry | glyph/field/particle/message reveal styles |
| `contract_version`, `ownership` | contract | must be `v001-integration` / `axiom` |

### Catalog input aliases → normalized tier

| Input | Normalized `size_tier` | `size_code` |
| --- | --- | --- |
| `small`, `s` | `small` | `S` |
| `medium`, `m`, null, `""`, unknown | `medium` | `M` |
| `large`, `l` | `large` | `L` |
| `S`, `M`, `L` (via sizeTierMap) | mapped tier | same letter |

Downstream LCARD broker proof normalizes missing/unknown → `medium` (11th canonical field). Android `PaintBoxTier.resolve()` matches the same fallback.

### Paint Box tier geometry (contract canon)

Glyph visual height rule (all tiers):

```text
glyphVisualSizePx = max(glyphVisualSizeFloorPx, paintBoxHeight × glyphVisualFraction)
```

Medium @ 1920×1080: paint box height = 1080 × 0.34 = 367.2px → glyph visual ≈ **183.6px** (floor 152px).  
Android `PaintBoxTier.kt` mirrors `previewVisual.paintBox.tiers` fractions from this contract.

---

## Known hail review

| Hail ID | Glyph | Seed `visual.scale` | Render-payload | Routes | Notes |
| --- | --- | --- | --- | --- | --- |
| `hail.star_trek_composed.001` | `custom-star-trek` (`compose_ring_flame`) | large | `size_tier: large`, `glyph_render` | arcade → master_bedroom | Active — H3 composed emblem + TV parity |
| `hail.spoon_transporter.001` | registry / `default` | medium | `size_tier: medium` | operator-defined | Active — spoon transporter variation |
| `hail.spoon_transporter.001` | `default` | large | — | — | **Retired** from operator catalog |
| `hail.spoon_transporter.001` | `default` | medium | — | — | **Retired** from operator catalog |
| `default` glyph | `default` | — | emoji fallback `✦` | — | allowlisted; fallback only |

---

## Downstream consumer alignment (post #180)

| Surface | Repo | Size tier | Effect scope | Proof |
| --- | --- | --- | --- | --- |
| Axiom API | `ctrl-alt-axiom` | emits `size_tier` + `size_code` | all 4 named effects in contract | N/A |
| LCARD adapter | `axiom-hail-render-payload-adapter.js` | maps `size_tier` → overlay `size_tier` | **transporter only** → `transporter_beam` | signs `size_tier` in broker proof |
| LCARD overlay gate | `hail-overlay-payload.js` | emits `size_tier` on POST | `transporter_beam` only | validates allowlists |
| Android APK | `PaintBoxTier.kt` / `PaintBoxLayout.kt` | honors `size_tier` on POST | **transporter_beam only** | validates broker proof incl. tier |
| LCARD web-preview | `web-preview/` | full tier table | **all 4 effects** | N/A (harness) |

**Android production scope (v001):** `transporter` / `transporter_beam` is the only effect implemented on device. `pop`, `burst`, and `none` remain **contract + preview-harness concepts** until explicitly scheduled.

**TvOverlay:** retired from LCARD Hail delivery path (`control-alt-lcard@b48e821`). Renderer readiness metadata cleaned in #87 — `hail_overlay` only, no `fallback_renderer`.

---

## Gaps requiring follow-up (not fixed in #84)

| Gap | Classification | Recommended action |
| --- | --- | --- |
| `HailsView` omits `visual` in editor body | UI gap | defer — full page redesign out of scope |
| Contract JSON vs Android `PaintBoxTier` drift | CI hygiene | future slice — contract parity smoke |
| `#83` inventory docs not on `main` yet | doc dependency | merge #83 or cherry-pick cross-refs |

---

## Related documents

| Document | Purpose |
| --- | --- |
| `docs/hails/size-tier-semantics-v001.md` | focused size_tier / size_code reference |
| `docs/hails-v001-integration.md` | integration overview (updated) |
| `docs/hails/glyph-inventory-v001.md` | glyph allowlist |
| `docs/hails/glyph-generation-standard-v001.md` | glyph generation rules |

When merged, also see `#83` inventory docs: `consumer-surface-matrix-v001.md`, `object-inventory-v001.md`, `effect-inventory-v001.md`.

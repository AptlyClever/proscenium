# Hail Effect Registry v001 — design

**Status:** Design authority for the Effect Registry campaign  
**Hails authority (fleet SoT):** `docs/hails/hails-authority-v001.md` — Axiom CRUD; registry/catalog stores as instructed (parallel pattern to glyphs).  
**Campaign:** `AptlyClever/praxis:objects/hails/20260615-axiom-hail-effect-registry-campaign-pso-001.md`  
**Superseded for delivery (2026-06-21):** `messageRevealStyle` / `messageRevealStart` — see **`pso-20260621-axiom-message-sidekick-registry`**.
**Parent PWI:** animation inventory rework (`pwi-20260613-hail-object-animation-inventory-rework`)  
**Date:** 2026-06-15

**Companions:** `effect-inventory-v001.md`, `animation-language-v001.md`, `hail-effects-gallery-v001.md`, `hails-runtime-readiness-audit-v001.md`, `config/hails/hail-render-contract.v001.json`

---

## Purpose

Define an **extensible effect registry** so Hail effects are:

1. **Catalog entries** — not a fixed four-id enum in application code.
2. **Customizable within family** — each entry exposes its own bounded tuning variables.
3. **Honestly previewed** — Axiom browse proof reflects registry semantics and capability limits.
4. **Addable without operator “create effect” UI** — new effects ship via contract + preview adapter.

The current named effects (`none`, `pop`, `burst`, `transporter`) are **v1 seed entries**. Placeholder `scan` and future effects use the same admission path.

---

## Design principles

| Principle | Meaning |
| --- | --- |
| **Registry SoT** | Effect definitions, tuning schemas, defaults, and capabilities live in Axiom contract JSON — consumed by backend, frontend, and documented consumers. |
| **Base + tuning** | `effect_id` selects identity and lifecycle; `effect_tuning` adjusts predefined variables — never replaces the effect family. |
| **Templates ≠ registry** | Gallery / loadout presets are **starter snapshots** (`effect_id` + tuning + suggested visual context), not a parallel effect system. |
| **Honest preview** | Preview renderer reads registry + hail visual; capability matrix drives honesty labels. |
| **Extensibility by addition** | New effect = new registry entry + preview adapter (+ consumer when ready). No UI rewrite. |
| **TV-safe budgets** | Tuning variables clamp to per-effect and global budgets from animation language + contract. |

---

## Registry location

**Decision (v1):** embed the registry in `config/hails/hail-render-contract.v001.json`.

Evolve the existing `previewVisual.namedEffects` block into an explicit **`effectRegistry`** section (may retain `namedEffects` as alias during migration).

Rationale:

- Single SoT already owns lifecycle, Paint Box, palettes, and workbench knobs.
- Avoids drift between render contract and a sibling file.
- Standards promotion path stays one artifact.

**Future split trigger:** contract file exceeds maintainability, or effect catalog releases on a different cadence than Paint Box geometry. If split: `config/hails/hail-effect-registry.v001.json` referenced by render contract.

---

## Registry entry shape (conceptual)

Each key in `effectRegistry.entries` is an effect id (kebab-case, stable):

```json
{
  "id": "transporter",
  "label": "Transporter",
  "status": "active",
  "default": true,
  "identity": {
    "glyphResolveStyle": "scan_resolve",
    "fieldStyle": "vertical_phase",
    "particleStyle": "scanfall",
    "messageRevealStyle": "secondary_scan_fade",
    "choreographyAnchors": { },
    "lifecycleTiming": {
      "entrance_animation_ms": 1900,
      "exit_animation_ms": 1400
    }
  },
  "tuning": {
    "variables": [
      {
        "key": "beam_intensity",
        "label": "Beam Intensity",
        "type": "range",
        "min": 0.2,
        "max": 1.0,
        "default": 0.78,
        "step": 0.02,
        "mapsTo": { "workbench": "beamOpacity" }
      },
      {
        "key": "beam_shape",
        "label": "Beam Shape",
        "type": "enum",
        "options": ["column", "cone", "orb", "shimmer"],
        "default": "column",
        "mapsTo": { "workbench": "beamShape" }
      },
      {
        "key": "beam_scale",
        "label": "Beam Scale",
        "type": "range",
        "min": 0.5,
        "max": 2.0,
        "default": 1.0,
        "mapsTo": { "workbench": "beam_field_scale" }
      },
      {
        "key": "beam_color_emphasis",
        "label": "Beam Color Emphasis",
        "type": "range",
        "min": 0.0,
        "max": 1.0,
        "default": 0.85,
        "note": "Composes with hail palette_id — does not replace loadout Color"
      }
    ],
    "defaults": {
      "beam_intensity": 0.78,
      "beam_shape": "column",
      "beam_scale": 1.0,
      "beam_color_emphasis": 0.85
    }
  },
  "capabilities": {
    "axiom_preview": "full",
    "lcard_preview": "full",
    "android": "partial",
    "android_note": "transporter_beam path; tuning subset TBD in Phase D"
  },
  "quality": {
    "rating": "usable",
    "recommendation": "keep"
  },
  "templates": ["transporter-sweep", "scanner-pass"]
}
```

### Field notes

- **`identity`** — migrates from current `namedEffects.effects.{id}`; defines choreography personality (animation language v001).
- **`tuning.variables`** — operator-facing controls; **`mapsTo`** links to internal workbench/projection keys (not exposed to operators).
- **`tuning.defaults`** — applied when hail omits `effect_tuning` or keys within it.
- **`capabilities`** — drives honesty badges and derive-preview warnings.
- **`templates`** — ids in `hail-effects-gallery.v001.json` that start from this base.
- **`status`** — `active` | `deprecated` | `preview_only` | `planned` (for `scan` before preview exists).

---

## v1 catalog entries (seed data)

Illustrative tuning variables — finalize in Phase A against existing workbench knobs.

| Effect ID | Operator variables (illustrative) | Internal mapping source | Capabilities (initial) |
| --- | --- | --- | --- |
| `none` | fade speed, message backing emphasis | animationProfiles.clean_hail, presetPresence | preview only |
| `pop` | pop size, pop impact, spark density | subtle_ping effectPresets, glyph_overshoot | preview only |
| `burst` | bloom strength, snap intensity, particle spread | high_attention / transporter_dense presets | preview only |
| `transporter` | beam intensity, beam shape, beam scale, beam color emphasis | transporter_soft / transporter_dense effectPresets | preview full; Android partial |
| `scan` | *(planned)* scan line speed, pass width, glow | TBD | `status: planned` until adapter lands |

Quality ratings carry forward from `effect-inventory-v001.md`; Phase D refactors weak defaults without removing entries.

---

## Hail record projection

### Persisted on hail (target)

| Field | Required | Validation |
| --- | --- | --- |
| `visual.effect_id` | yes | Must exist in registry; `status` must allow selection |
| `visual.effect_tuning` | no | Validated against entry `tuning.variables`; missing keys filled from defaults |
| `visual.effect_template_id` | no | Informational; must reference a template compatible with `effect_id` if present |
| `visual.palette_id` | yes | Loadout Color — hail-wide palette |
| `visual.scale` | yes | Size tier — scales Paint Box envelope |
| `visual.duration_ms` | yes | Stable hold only (unchanged) |

### Not persisted (preview / UX only)

- `transition_style` (unless promoted later as tuning variable on specific effects)
- Paintbox CSS preset class names
- Gallery mood strings

### Consumer render payload (additive)

`build_consumer_render_payload()` projects:

- `effect_id`
- `effect_tuning` (normalized snapshot)
- `effect_identity` (derived from registry entry identity + tuning projection)
- lifecycle timing (unchanged additive model)
- **capability_summary** (optional honesty helper for LCARD / diagnostics)

Workbench-only blocks (`effectPresets`, raw `animationProfiles`) remain **internal** — not copied verbatim to payload.

---

## Starter templates (gallery)

`config/hails/hail-effects-gallery.v001.json` becomes a **template catalog**:

```json
{
  "id": "transporter-sweep",
  "effect_id": "transporter",
  "effect_tuning": { "beam_intensity": 0.78, "beam_shape": "shimmer", "beam_scale": 1.0 },
  "visual": {
    "palette_id": "axiom_dark_cyan",
    "scale": "medium",
    "duration_ms": 5000,
    "placement_id": "upper_center"
  },
  "preview": {
    "reduced_motion": false,
    "animation_enabled": true
  }
}
```

Applying a template:

1. Sets `effect_id` and `effect_tuning` (full snapshot).
2. Sets suggested `palette_id`, `scale`, `duration_ms`, `placement_id`.
3. Optionally records `effect_template_id` for UX (“based on Transporter Sweep”).

Templates do **not** define new effect ids.

---

## Preview architecture

### Surfaces

| Surface | Motion | Toggle |
| --- | --- | --- |
| **Hails browse proof** | Registry renderer when effects enabled | **Enable Effects / Disable Effects** (default: enabled) |
| **Hails edit studio** | Static WYSIWYG | N/A — always static per doctrine |
| **Composer** | Registry renderer | Optional: inherit browse toggle or always animate |

### Renderer contract (Axiom)

```text
resolvePreview(effect_id, effect_tuning, visual_context, registry)
  → lifecycle phases + envelope geometry + honesty metadata
```

Phase B may implement per-effect preview modules behind a registry lookup table. CSS preset classes (`hail-paintbox-effect-*`) become **legacy fallback** until each entry has a registry renderer.

### Honesty labels (from capabilities)

| Condition | Operator message (example) |
| --- | --- |
| `android: none` | Preview only — not delivered to TV |
| `android: partial` | TV delivers transporter subset; tuning may differ |
| `status: planned` | Effect not yet previewable |
| Effects disabled | Static proof — motion off |

---

## API changes (planned)

| Endpoint | Change |
| --- | --- |
| `GET /api/hails/render-contract` | Expose `effectRegistry` (entries, templates reference) |
| `GET /api/hails` | `known_effects` derived from registry; include tuning schema summary for UI |
| `POST/PATCH` hail save | Validate `effect_tuning` per entry |
| `GET /api/hails/{id}/render-payload` | Include normalized `effect_tuning` + capability summary |
| `POST /api/hails/derive-preview` | Warnings from registry capabilities |

---

## UI behavior (planned)

### Loadout (edit + create)

- **Effect chip row** — populated from registry (`status: active`).
- Selecting chip sets `effect_id`; resets `effect_tuning` to entry defaults (v1 — confirm UX in Phase C).
- **Customize** expands per-entry variable controls (Phase C).

### Gallery (Composer)

- Preset cards apply **template snapshots** (base + tuning + visual suggestions).
- Card copy describes mood; underlying ids come from template record.

### Browse proof

- Toggle: **Enable Effects** / **Disable Effects** (default enabled).
- When enabled: registry preview renderer + capability badge.
- When disabled: static glyph/message/frame.

---

## Extensibility: admitting a new effect

Example: add `scan` without operator create UI.

1. **Registry** — add `scan` entry with identity, tuning schema, defaults, `status: preview_only`.
2. **Validation** — backend accepts `effect_id: scan` and validates tuning.
3. **Preview** — implement `scan` module in Axiom registry renderer.
4. **Templates** — optional gallery starter (“Scanner Pass v2”).
5. **Inventory** — update `effect-inventory-v001.md`.
6. **Consumers** — update LCARD/Android capability when scheduled; honesty matrix updated.

No changes to loadout component structure if UI is registry-driven.

---

## Migration from current state

| Current | Target |
| --- | --- |
| Hardcoded `KNOWN_NAMED_EFFECT_IDS` | Derived from registry |
| Gallery → `visual.*` only | Gallery → template → `effect_id` + `effect_tuning` + visual |
| Paintbox CSS per preset id | Registry preview module per `effect_id` |
| `namedEffects.effects.*` | `effectRegistry.entries.*` (alias during transition) |
| Workbench `effectPresets` | Internal mapping targets for `tuning.variables.mapsTo` |

**Backward compatibility:** hails with only `effect_id` validate; defaults applied for missing `effect_tuning`. Unknown legacy effect ids fail validation with clear 422.

---

## Campaign phases (implementation map)

| Phase | Deliverable |
| --- | --- |
| **A — Registry foundation** | Contract shape, validation, API exposure, data-driven effect lists |
| **B — Honest browse + toggle** | Enable/Disable Effects; registry preview; capability badges |
| **C — Tuning UX** | Customize panel, persistence, template application |
| **D — Quality + consumers** | Weak effect rework; LCARD/Android tuning consumption |
| **E — Evidence** | Inventory update, device proof when approved |

---

## Non-goals

- Operator-authored net-new effect types from scratch.
- Free-form numeric workbench knobs in operator UI.
- Animated edit-studio preview (doctrine forbidden).
- Replacing palette / size tier loadout dimensions.

---

## Open items (Phase A refinement)

- [ ] Final per-entry tuning variable list and clamp ranges (TV-safe review).
- [ ] Exact `mapsTo` projection into `effect_identity` for LCARD.
- [ ] Whether `transition_style` becomes a tuning variable on specific entries or remains template-only.
- [ ] Composer: always animate vs respect browse toggle.
- [ ] JSON Schema promotion to ctrl-alt-standards (deferred until shape stabilizes).

---

## Versioning

- Document: `effect-registry-v001`
- Bump with registry shape or tuning schema breaking changes
- Coordinate with `animation-language-v001` and render contract `v001-integration` revision policy

---

## Phase A implementation (2026-06-15)

Implemented on branch `task/hail-effect-registry-phase-a-v001`:

| Area | Location |
| --- | --- |
| Contract `effectRegistry.entries` | `config/hails/hail-render-contract.v001.json` |
| Loader, validation, API projection | `backend/hails_render_contract.py` |
| `GET /api/hails` → `effect_registry` | `backend/main.py` |
| `GET /api/hails/render-contract` → `effect_registry` | `backend/main.py` |
| Gallery preset `effect_tuning` schema | `config/hails/hail-effects-gallery.v001.json` |
| Frontend types | `frontend/src/api.ts` |
| Data-driven effect list fallback | `frontend/src/views/HailsView.tsx` |

**Not yet implemented:** hail `effect_tuning` persistence (Phase C).

---

## Phase B implementation (2026-06-15)

Honest browse preview + **Enable / Disable Effects** toggle (default on). Edit loadout preview stays static.

| Area | Location |
| --- | --- |
| Registry-honest preview resolver | `frontend/src/hailEffectRegistryPreview.ts` |
| Browse proof band + toggle | `frontend/src/components/hail-studio/HailBrowseProofPanel.tsx` |
| Paintbox registry mode + toggle respect | `frontend/src/components/HailPaintboxPreview.tsx` |
| Session toggle state | `frontend/src/views/HailsView.tsx` (`hail-browse-effects-enabled`) |
| Expand dialog parity | `frontend/src/components/hail-studio/HailPaintboxExpandDialog.tsx` |
| Verifier | `frontend/scripts/verify-hails-effect-registry-preview-v001.mjs` |

**Behavior:**

- Browse proof maps `visual.effect_id` → paintbox CSS presets (not gallery preset id).
- Capability honesty badges from registry `capabilities` (e.g. preview-only, planned).
- Edit panel: `animationEnabled={false}`, `variant="studio"` — unchanged static WYSIWYG.
- Toggle persists in `sessionStorage` for the management session.

---

## Phase C implementation (2026-06-15)

Per-effect **Customize** panel, `effect_tuning` persistence, and gallery template snapshots.

| Area | Location |
| --- | --- |
| Visual contract field | `frontend/src/hailVisualContract.ts` (`effectTuning` ↔ `effect_tuning`) |
| Tuning helpers | `frontend/src/hailEffectTuning.ts` |
| Loadout customize UI | `frontend/src/components/HailLoadoutPresets.tsx` |
| Gallery template tuning | `frontend/src/hailEffectsGallery.ts` |
| Save validation + normalize | `backend/hails_domain.py` |
| Verifier | `frontend/scripts/verify-hails-effect-registry-tuning-v001.mjs` |

**Behavior:**

- Effect chip selection resets `effect_tuning` to registry entry defaults.
- **Customize effect** expands per-variable controls (range / enum) from registry schema.
- Save persists normalized `visual.effect_tuning` via backend `normalize_effect_tuning`.
- Gallery **Apply Effect** copies preset `effect_tuning` snapshot alongside visual fields.

---

## Phase D implementation (2026-06-15)

Consumer tuning projection, registry-based preview warnings, and TV-safe default refinements.

| Area | Location |
| --- | --- |
| Tuning projection + capability summary | `backend/hails_render_contract.py` |
| Registry-based derive-preview warnings | `backend/hails_preview.py` |
| Android tuning subset on transporter | `config/hails/hail-render-contract.v001.json` |
| Pop/burst default tuning refinement | `config/hails/hail-render-contract.v001.json` |
| Verifier | `frontend/scripts/verify-hails-effect-registry-consumer-v001.mjs` |

**Consumer payload additions:**

- `effect_tuning` — normalized operator snapshot
- `effect_tuning_projection` — workbench keys via registry `mapsTo`
- `android_effect_tuning` — TV-consumable subset (`beam_intensity`, `beam_scale` for transporter)
- `capability_summary` — honesty metadata for LCARD / diagnostics

**Quality rework:** `pop` and `burst` registry defaults lowered for TV-safe harness preview; entries remain `weak` / harness-only until Android multi-effect is scheduled.

---

## Phase E implementation (2026-06-15)

Campaign evidence and inventory refresh. Closes Axiom scope for #137.

| Area | Location |
| --- | --- |
| Inventory refresh | `docs/hails/effect-inventory-v001.md` |
| Campaign acceptance | This document (checklist below) |
| Praxis record status | `docs/praxis/20260615-axiom-hail-effect-registry-campaign-px001.md` |
| Handoff report | `ctrl-alt-handoff:apps/axiom/reports/20260615-axiom-hail-effect-registry-campaign-v001-report.md` |
| Verifier | `frontend/scripts/verify-hails-effect-registry-evidence-v001.mjs` |

### Campaign acceptance (PSO sketch)

- [x] Registry shape documented and validated in contract tests.
- [x] Browse proof: Enable/Disable Effects toggle (default on).
- [x] Preview uses registry semantics; CSS preset mapping scoped to honest browse fallback.
- [x] `effect_tuning` persisted and validated per entry.
- [x] Capability honesty visible per effect (browse badges + derive-preview warnings).
- [x] Extensibility proven by `scan` planned registry entry and admission path in design doc.
- [x] Parent PWI inventory report updated (`effect-inventory-v001.md`).

**Deferred (explicit):** Android Kotlin consumption of variation fields on device (`control-alt-lcard#181`); deploy.

**Phase G (2026-06-15):** LCARD adapter passes `effect_variation_id`, merged `effect_identity`, and `android_effect_tuning` on overlay POST. Evidence: `reports/hails-transporter-phase-g-evidence-g4-v001.md`.

---

## Effect variations (v2) — locked decisions

**Status:** **F4/F5 shipped** (pop shape + burst type catalogs; LCARD bridge). Transporter variations (F1–F3 + Phase G) complete. Arcade device sign-off per checklist below.  
**Goal:** Each effect family exposes **addable variations** that define and display a **unique timed impact on the glyph**.  
**Parent layering:** Glyph → Effect family → **Variation** → Choreography → Tuning (see `effects-enhancement-v001.md` three-layer preview).

### Operator decisions (2026-06)

| Decision | Choice |
| --- | --- |
| Persisted field | **`effect_variation_id`** (not `profile`) |
| `none` family | **No variations** until needed — family-level only |
| Color / palette | **Palette-driven per variation** — each variation ships a **recommended palette** (operator Color loadout); effect beams/glow/particles consume palette roles |
| Variation labels | **Cheeky reference names** (not franchise trademarks in ids) |

### Naming convention (transporter theme)

Stable registry ids are **kebab-case**; operator-facing labels are cheeky homages:

| `effect_variation_id` | Label | Inspiration (docs/reference only) | Palette posture |
| --- | --- | --- | --- |
| `voyaging` | Voyaging | Voyager transporter cycle (narrow column, scanfall) | Cool blue-white operational (baseline; `transporter_white` or dedicated voyaging palette) |
| `generation-next` | Generation Next | TNG transporter | Blue-forward shimmer column |
| `spoon` | Spoon | Cardassian transporter | Golden amber, shimmery dense column |
| *(planned)* `romulan` | TBD | Romulan cloaking/materialize idiom | TBD |
| *(planned)* `klingon` | TBD | Klingon transporter idiom | TBD |

**Rule:** ids and labels never use registered marks in code paths consumers log; `reference` string in registry is for operator docs only.

Pop and burst families use the same **variation** mechanism with dedicated naming tables:

| Family | `effect_variation_id` | Label | Palette posture |
| --- | --- | --- | --- |
| **pop** | `soft-tap` | Soft Tap | Soft purple baseline (`cute_purple`) |
| **pop** | `snap-back` | Snap Back | Cyan snap (`axiom_dark_cyan`) |
| **pop** | `bubble-pop` | Bubble Pop | Wide soft flash (`transporter_white`) |
| **burst** | `pulse` | Pulse | Baseline radial (`axiom_dark_cyan`) |
| **burst** | `solar-flare` | Solar Flare | Hot bloom (`cute_purple`) |
| **burst** | `rippler` | Rippler | Wide ring (`transporter_white`) |

### Persisted hail shape

```json
{
  "visual": {
    "effect_id": "transporter",
    "effect_variation_id": "voyaging",
    "effect_tuning": { "beam_intensity": 0.78, "beam_scale": 1.0 },
    "palette_id": "transporter_white"
  }
}
```

- Missing `effect_variation_id` → backend applies family **`defaultVariationId`**.
- **`none`:** omit variations block; no `effect_variation_id` field required.

### Registry entry shape (additive)

Under each family entry (except `none`):

```json
{
  "defaultVariationId": "voyaging",
  "variations": {
    "voyaging": {
      "label": "Voyaging",
      "status": "active",
      "default": true,
      "reference": "Voyager-style transporter cycle — narrow filament column, scanfall, phased glyph scan-resolve",
      "recommended_palette_id": "transporter_white",
      "identity": {
        "fieldStyle": "vertical_phase",
        "particleStyle": "scanfall",
        "beamProfile": "narrow_filament_column"
      },
      "tuning": { "variables": [], "defaults": {} },
      "preview": { "module": "transporter", "profile": "voyaging" }
    },
    "generation-next": {
      "label": "Generation Next",
      "recommended_palette_id": "transporter_generation_next",
      "preview": { "module": "transporter", "profile": "generation-next" }
    },
    "spoon": {
      "label": "Spoon",
      "recommended_palette_id": "transporter_spoon",
      "preview": { "module": "transporter", "profile": "spoon" }
    }
  }
}
```

**Identity merge:** `resolvedIdentity = { ...family.identity, ...variation.identity }` with choreography anchor overrides per variation.

**Palette merge:** Variation and Color are **independent** loadout dimensions.

1. **Color** — operator picks `palette_id` from the generic palette list (saved on the hail).
2. **Variation** — sets choreography/profile only; does **not** change `palette_id` on save.
3. **Preview** — when a family has variations, the effect layer uses each variation's canonical palette (`recommended_palette_id`); the Color loadout does **not** tint variation preview yet.
4. Families without variations still use hail `palette_id` in preview.

Contract keeps `recommended_palette_id` per variation for preview and downstream consumers.

### Preview architecture

```text
effect_id → family module (transporter | pop | burst)
effect_variation_id → profile within module (voyaging | generation-next | spoon | …)
effect_tuning → profile-specific clamped variables
palette_id → --hail-paintbox-* roles (effect layer only)
```

DOM unchanged: `[data-hail-effect-envelope]` + `[data-hail-glyph-artwork]`. Profiles add `data-hail-registry-variation="{id}"` for CSS.

Adding a variation = registry entry + preview profile + palette (if new) + verifier assertion — **no new family module**.

### Consumer payload (additive)

- `effect_variation_id`
- `effect_variation` — `{ id, label, recommended_palette_id }` honesty helper
- `effect_identity` — merged family + variation identity

### Implementation phases (proposed)

| Phase | Scope |
| --- | --- |
| **F1** | Contract `variations` block; `effect_variation_id` validation + defaults; API/registry projection | **complete** |
| **F2** | Edit studio + Forge variation picker; variation tuning defaults on change | **complete** |
| **F3** | Preview profiles: `voyaging` (current column geometry), then `generation-next`, `spoon` | **complete** |
| **F4** | Pop shape variations + burst type variations (separate naming tables) | **complete** |
| **F5** | LCARD/Android variation consumption | **complete** (static); Arcade checklist `reports/hails-effect-variations-f5-arcade-checklist-v001.md` |

**Work pause:** Doctrine `hail-effects-transporter-first` — Phase G **exited** 2026-06-15. F4/F5 pop/burst variations may proceed. Imprint: `hail-effects-renderer-capabilities-and-limits`.

### Migration

| Today | v2 |
| --- | --- |
| `effect_id` only | `effect_id` + `effect_variation_id` |
| `beam_shape` tuning enum on transporter | Retired in favor of variation (tuning = intensity/scale/emphasis only) |
| Single transporter preview CSS | Profile-keyed CSS per variation |
| Gallery templates | `effect_id` + `effect_variation_id` + tuning snapshot |

---

## Follow-on campaign

**Hail Effects Enhancement** (`pso-20260616-axiom-hail-effects-enhancement-campaign`) — replaces interim CSS preset authoring preview with registry-faithful renderer, correct Color scope, and transporter parity toward Android/LCARD. Design: `docs/hails/effects-enhancement-v001.md`.

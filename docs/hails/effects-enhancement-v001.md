# Hail Effects Enhancement v001 — design

**Status:** Active campaign design authority  
**Campaign:** `AptlyClever/praxis:objects/hails/20260616-axiom-hail-effects-enhancement-campaign-pso-001.md`  
**Parent:** Effect Registry campaign (#137), animation inventory PWI  
**Date:** 2026-06-16

**Companions:** `effect-registry-v001.md`, `animation-language-v001.md`, `effect-inventory-v001.md`, `object-inventory-v001.md`, `catalog-render-contract-hygiene-v001.md`, `config/hails/hail-render-contract.v001.json`

---

## Purpose

Close the gap between **Axiom authoring previews** (`#/axiom/hails`, `#/axiom/hails/forge`) and **contract + Android/LCARD runtime semantics** for Hail Effects and Color loadout.

Effect Registry campaign (#137) delivered registry SoT, tuning persistence, and an **interim CSS preset preview**. This campaign replaces that interim layer with a **registry-faithful, glyph-anchored preview renderer** and correct **Color scope**.

---

## Three enhancement pillars

### 1. Color — effect presentation only

**Contract:** `visual.palette_id` → palette roles in `hail-render-contract.v001.json` (`beamCyan`, `beamWhite`, `glyphGlow`, `messageColor`, `roles.*`).

| Apply palette to | Authoring preview |
| --- | --- |
| Effect beams, sweep, particles, glow | **Yes** |
| Preview card border / panel background | **No** |
| Glyph SVG fill | **No** (monochrome; glow from effect layer) |
| Message text | **Only** via explicit `messageColor` / `roles.text` if product accepts |

**Remove:** `--hail-paintbox-border`, `--hail-paintbox-panel-bg` driven by palette loadout on studio/forge previews.

**Keep:** `--hail-paintbox-cyan`, `--hail-paintbox-soft`, `--hail-paintbox-urgent` (and siblings) sourced from palette roles for **effect motion layers**.

Loadout copy: *“Effect colors — beams, glow, and particles. Does not recolor the preview frame or glyph artwork.”*

### 2. Effects — registry identity and lifecycle

**Not:** `hailPaintboxPreviewEffects.ts` infinite CSS mapped from gallery preset ids (`transporter-sweep`, `priority-pulse`, …) — see `local-paintbox-preview-richness-v001.md` (superseded for authoring).

**Yes:** Per-`effect_id` preview modules driven by registry **identity**:

| Field | Role |
| --- | --- |
| `glyphResolveStyle` | How glyph materializes (`fade`, `overshoot_pop`, `scan_resolve`, …) |
| `fieldStyle` | Field geometry (`vertical_phase`, `micro_flash`, `radial_bloom`, …) |
| `particleStyle` | Particle behavior (`scanfall`, `tiny_sparks`, …) |
| `messageRevealStyle` | Message timing vs glyph lock-in |
| `choreographyAnchors` | Phase fractions of `entrance_animation_ms` |
| `lifecycleTiming` | Entrance / exit ms (stable = `visual.duration_ms`) |

**Animation law** (`animation-language-v001.md`):

```text
hidden → entrance → stable (hold) → exit → cleared
```

- Transport beams: **entrance/exit only**, localized to glyph focus — not infinite stable shimmer.
- Particles and field effects stay inside **effect envelope** around glyph.

### 3. Preview parity — Android / LCARD reference

**Transporter (production on Android):**

From `object-inventory-v001.md` (post LCARD #178):

| Phase | Expected behavior |
| --- | --- |
| Entrance | Paint Box–local beam envelope; scan_resolve + vertical_phase + scanfall |
| Stable | Readable glyph + message; **beam fully gone**; optional glyph-local residual only |
| Exit | Dematerialize; clear overlay |

Authoring preview must converge on this — not full-card CSS sweeps.

**Harness effects (`pop`, `burst`, `none`):**

- Full choreography in **LCARD web-preview** and registry contract.
- **Not on Android** until scheduled — UI shows capability honesty; preview still uses registry modules in Axiom.

**Deferred:** Device visual proof (`control-alt-lcard#181`) is campaign exit evidence, not Phase A blocker.

---

## Shared authoring surfaces

Both routes use the **same** preview stack (`HailRegistryAuthoringPreviewStack` → `HailPaintboxPreview` when `registryHonestPreview`), with **`authoringIntent`** selecting operator defaults (see `forge-authoring-intents-v001.md`):

| Surface | Component | `authoringIntent` | Toggle |
| --- | --- | --- | --- |
| `#/axiom/hails` edit | `HailStudioEditPanel` → stack | `compose` | `HailEffectsPreviewToggle` (`surface="studio"`) |
| `#/axiom/hails/forge` Effects | `HailForgeEffectWorkspace` → stack | `effect` | `HailAuthoringPreviewControls` — Effects + Glyph On/Off |
| `#/axiom/hails/forge` Glyphs (custom) | `HailForgeGlyphWorkspace` → stack | `glyph` | `HailAuthoringPreviewControls` — Effects Off by default + Glyph focus / TV size |
| Forge built-in glyph (readonly) | static reference preview | — | no toggle |

Props: `registryHonestPreview`, `registryEntry`, `effectsPreviewEnabled`, `visual`, `effect_tuning` (when tuning affects preview).

---

## Three preview layers (operator model)

Authoring preview separates **identity** from **effect personality** from **choreography**:

| Layer | Source | Preview DOM |
| --- | --- | --- |
| **Glyph** | `glyph_id` + artwork | `[data-hail-glyph-artwork]` — resolve animation only (`scan_resolve`, etc.) |
| **Effect** | `effect_id` identity (`fieldStyle`, `particleStyle`) | `[data-hail-effect-envelope]` — beam, bloom, sparks, scanfall |
| **Choreography** | `choreographyAnchors` + `lifecycleTiming` | Phase controller + CSS delays (`glyphResolveStart`, `messageRevealStart`) |

Transporter is the reference implementation: narrow centered column beam (~20% width default, LCARD workbench parity) + scanfall in the same envelope; glyph scan-resolve on artwork after `glyphResolveStart` (~42% of entrance); stable hold with beam fully gone. Beam height derives from glyph envelope (~58% of focus region), not full Paint Box — see `ctrl-alt-handoff` safe-zone handoff (2026-06-11).

**Variations (v2, planned):** `effect_variation_id` under each family — transporter seed: `voyaging`, `generation-next`, `spoon` (palette-suggested per variation). See `effect-registry-v001.md` § Effect variations (v2).

## Preview renderer architecture (target)

```text
HailPaintboxPreview
  └─ useRegistryPreview({ effectId, effectTuning, visual, registryEntry, effectsEnabled })
       └─ resolveRegistryPreview()     // phase plan + honesty
       └─ RegistryPreviewStage         // timed DOM/SVG/canvas layer on [data-hail-paintbox-glyph]
       └─ paletteEffectVars(paletteId) // effect-layer colors only
```

**Phase controller:**

- On Effects On or loadout change: loop **entrance** (contract `entrance_animation_ms`) → **stable** (5s authoring hold) → **gap** (5s pause) → replay. Pacing from `DEFAULT_AUTHORING_PREVIEW_LOOP_TIMING` / `resolveAuthoringPreviewLoopTiming()` until operator or standards timing control lands.
- `prefers-reduced-motion` and Effects Off → static stable frame.

**Migration:**

| Current | Target |
| --- | --- |
| `data-hail-paintbox-glyph-motion` + infinite CSS | Timed registry modules |
| `PRESET_EFFECTS` / `EFFECT_ID_PRESET` | Registry entry `identityRef` + identity fields |
| Profile/browse legacy CSS | Quarantine or migrate in later slice |

---

## Implementation map (campaign phases)

| Phase | Deliverable | Key files (initial) |
| --- | --- | --- |
| **A** Color scope | Effect-only palette vars | `index.css`, `HailLoadoutPresets.tsx`, `HailPaintboxPreview.tsx` |
| **B** Renderer foundation | Phase controller, replace CSS mapping | `hailRegistryPreviewRenderer.ts` (new), `hailEffectRegistryPreview.ts` |
| **C** Effect modules | none, pop, burst, transporter modules + tuning + message reveal + particles | `hailRegistryPreviewModules.ts`, `index.css`, `HailPaintboxPreview.tsx` |
| **D** Mirror + doctrine | Hails/Forge shared stack + doctrine | `HailRegistryAuthoringPreviewStack.tsx`, Praxis doctrines, `verify-hails-effects-enhancement-phase-d-v001.mjs` |
| **E** Evidence | inventory + handoff + #181 | `effect-inventory-v001.md`, handoff report |
| **G** Transporter fidelity | Authoring preview ≈ LCARD canvas reference | `hailTransporterCanvasPreview.ts`, `parity-g2.html` — **complete** (effect canvas); **Tier B** full-package gate → `paintbox-parity-standards-alignment-v001.md` |

---

## Renderer capabilities (locked)

Praxis imprint **`hail-effects-renderer-capabilities-and-limits`** and doctrine **`hail-effects-transporter-first`**. Axiom owns effects; LCARD consumes Axiom render-payloads. **Phase G complete (2026-06-15)** — authoring uses LCARD-aligned canvas for transporter; CSS beam shim retired when canvas preview active. Mirror: `docs/praxis/20260614-hail-effects-renderer-lockdown-px001.md`, evidence: `reports/hails-transporter-phase-g-evidence-g4-v001.md`.

---

## Verification

```bash
cd frontend && npm run build
node scripts/verify-hails-effect-registry-preview-v001.mjs   # extend for renderer
node scripts/verify-hails-studio-d-layout.mjs
node scripts/verify-hails-forge-page-v001.mjs
# New: verify-hails-effects-enhancement-v001.mjs (Phase A onward)
```

Manual:

1. Hails edit — toggle Effects; switch Color → effect tint only; card neutral.
2. Forge Effect workspace — same loadout → same preview behavior.
3. Transporter — entrance choreography, stable without beam loop.
4. Pop/burst — distinct from transporter; honesty if Android unavailable.

---

## Non-goals

See campaign PSO. Notably: net-new effect types, Android multi-effect shipping, registry schema rewrite.

---

## Versioning

- Document: `effects-enhancement-v001`
- Bump when preview renderer contract or Color semantics change

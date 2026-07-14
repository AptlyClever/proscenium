# Hail Authoring Surface Contract (HASC) v002

**Status:** Active — graduated at **Hails Collective Beta 2.0** (`hails-2.0-beta`, 2026-06-17). Supersedes the v001 doc for new work; v001 remains historical.
**Collective authority:** `docs/hails/hails-collective-beta-v002.md`
**Praxis:** `pso-20260614-axiom-hail-authoring-surface-contract` · `pso-20260619-axiom-paintbox-parity-standards-alignment`  
**Id:** `hail-authoring-surface-contract-v002`

Does **not** replace page templates or templet layout. It binds **behavior** inside existing regions to three planes and one compositor.

---

## 1. Three planes

| Plane | Role | Canonical modules | Persisted? |
| --- | --- | --- | --- |
| **Compositor** | What renders (registry-honest consumer path) | `HailRegistryAuthoringPreviewStack` → `HailPaintboxPreview` → `HailPackagePreviewLayers` | No |
| **View** | What the operator sees (layer visibility, scale mode) | `hailAuthoringPreviewChipSet.ts` → `HailAuthoringPreviewControls` | No |
| **Definition** | What gets saved | `HailLoadoutPresets` (+ Forge glyph `HailGlyphMotionPresets`) | Yes |

**Rule:** No surface may mount a parallel paintbox or alternate glyph/effect renderer. One compositor, intent-filtered view chips, shared loadout core.

---

## 2. Compositor API

### Entry point

`HailRegistryAuthoringPreviewStack` is the **only** authoring preview entry for:

- Hail Forge → Glyphs (`authoringIntent="glyph"`, `surface="forge"`)
- Hail Forge → Effects (`authoringIntent="effect"`, `surface="forge"`)
- Hails edit (`authoringIntent="compose"`, `surface="studio"`)

DOM markers:

| Attribute | Value |
| --- | --- |
| `data-hail-registry-authoring-preview-stack` | always |
| `data-hail-authoring-surface` | `forge` \| `studio` \| `new` |
| `data-hail-authoring-intent` | `glyph` \| `effect` \| `compose` |
| `data-hail-authoring-scale-mode` | `design` \| `delivery` |
| `data-hail-authoring-preview-viewport` | fixed **18rem × 16rem** |

### Package stack (inside viewport)

See `hail-authoring-package-v001.md` and `paintbox-authoring-chrome-v001.md`.

```text
data-hail-package
  data-hail-effect-layer   ← Effect choreography
  data-hail-glyph-layer    ← Glyph artwork
data-hail-paintbox-message ← below package (compose / toggled)
```

Render authority: `hails-render-parity-v001.md` — `derive-preview` only.

---

## 3. View plane — preview chip catalog

**Source of truth:** `hailAuthoringPreviewChipSet.ts`

| Chip | Kind | Layer / action | Surfaces |
| --- | --- | --- | --- |
| Design view | view-mode | `delivery` → `design` scale | Forge glyph |
| TV size | view-mode | `design` → `delivery` scale | Forge glyph |
| Effect | layer | `data-hail-effect-layer` visibility | Forge glyph, Hails compose |
| Glyph | layer | `data-hail-glyph-layer` visibility | Forge effect |
| Message | layer | `data-hail-paintbox-message` visibility | Forge glyph, Hails compose |
| Shell | layer | stage shell chrome | All authoring |
| Regenerate | action | glyph seed variation | Forge glyph |
| Reset | action | glyph seed reset | Forge glyph |
| Recipe | meta (non-interactive) | family label | Forge glyph, design view |

**Chip sets by intent** (`preview-chip-sets-v001.md`):

| Intent | Chips (order) |
| --- | --- |
| `compose` | Effect · Message · Shell |
| `glyph` | Design view · TV size · Effect · Message · Shell · Regenerate · Reset |
| `effect` | Glyph · Shell (motion always on) |

**Prohibited:** new preview chips outside the catalog; “On/Off” suffixes on labels; mirroring forge view-mode chips on Hails compose.

---

## 4. Definition plane — loadout catalog

**Source of truth:** `HailLoadoutPresets.tsx`

| Row | Field | Layer | Surfaces |
| --- | --- | --- | --- |
| Size | `visual.scale` | Shell / package tier | Forge, Hails |
| Color | `visual.paletteId` | Effect presentation | Forge, Hails |
| Effect | `visual.effectId` | Effect module | Forge, Hails |
| Variation | `visual.effectVariationId` | Effect choreography | Forge, Hails |
| Customize | `visual.effectTuning` | Effect tuning | **Forge only** |
| Animation | `glyph.animation_enabled` | Glyph motion | **Forge glyph only** |
| Speed | `glyph.speed_tier` | Glyph motion | **Forge glyph only** |
| Transition | `glyph.transition_style` | Glyph motion | **Forge glyph only** |

Hails compose **inherits** glyph motion from the selected glyph; it does not edit motion on the management page (page template `effect_customization_on_loadout`).

**Chip primitive:** loadout `chipClass` and preview `previewChipClass` share geometry (pill, `aria-pressed`, brand active state).

---

## 5. Page template binding (layout unchanged)

Logical **preview + loadout band** — same grid (`hailAuthoringPreviewLoadoutGridClass`), different region ids:

| Template | Region id | Component |
| --- | --- | --- |
| `axiom.hails.forge.v001` | `authoring_preview_loadout` | `HailForgeGlyphWorkspace` / `HailForgeEffectWorkspace` |
| `axiom.hails.management.v001` | `definition_editor` (top band) | `HailStudioEditPanel` preview row |

Below the band:

| Template | Region | Component |
| --- | --- | --- |
| Forge | `authoring_identity_editor` | Glyph name / Effect fields |
| Hails | `definition_editor` | Glyph strip, Name, Message, route row |

See `page-template-bindings-v001.md`.

---

## 6. Scale modes and parity

| Mode | Surfaces | Package sizing |
| --- | --- | --- |
| `design` | Forge glyph, Design view only | Full hero (100% anchor box) |
| `delivery` | Hails compose (always); Forge TV size; Forge effect | `PAINTBOX_TIERS` envelope |

**Parity invariant:** For the same `visual.scale` and delivery mode, **Forge TV size ≡ Hails compose** for tier envelope % and cluster glyph scale. Anchor differs only (`center` vs `placement_id`).

**Tier A** — enforced by `hailAuthoringSurfaceContract.ts` + `verify-hails-authoring-surface-contract-v001.mjs`.

**Tier B** — full package visual parity at stable (glyph + effect + message): `paintbox-parity-standards-alignment-v001.md` (`pso-20260619-axiom-paintbox-parity-standards-alignment`).

---

## 7. Prohibited patterns

| Id | Description |
| --- | --- |
| `parallel_authoring_preview` | Second paintbox component or preview-only renderer on Forge/Hails edit |
| `ad_hoc_preview_chips` | Chips not registered in `hailAuthoringPreviewChipSet.ts` |
| `motion_editor_on_hails` | Animation / Speed / Transition editors on Hails management loadout |
| `effect_tuning_on_hails` | Effect customize sliders on Hails loadout |
| `package_shrink_wrap` | Sizing `data-hail-package` from glyph SVG bounds |
| `separate_browse_proof_band` | Full-stage proof above inline band (page template) |

---

## 8. Related contracts

| Doc | Scope |
| --- | --- |
| `paintbox-authoring-chrome-v001.md` | Viewport + DOM |
| `hail-authoring-package-v001.md` | Package binding |
| `preview-chip-sets-v001.md` | View chips |
| `forge-authoring-intents-v001.md` | Intent defaults |
| `hails-render-parity-v001.md` | Consumer render |
| `paintbox-parity-standards-alignment-v001.md` | Tier B + standards map |
| `page-template-bindings-v001.md` | Region map |

---

## 9. Verification

```bash
cd frontend
npm run verify:hails-authoring-surface-contract
```

Also included in `verify:hails-forge-page-template` and `verify:hails-page-template`.

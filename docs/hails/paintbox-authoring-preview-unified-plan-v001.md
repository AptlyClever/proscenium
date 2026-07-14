# Paintbox authoring preview — unified plan addendum v001

**Status:** **Active implementation addendum** — reconciles Forge and Hails preview UX without changing render parity.  
**Praxis:** `pso-20260618-axiom-forge-preview-unified-plan` · `pso-20260617-axiom-forge-authoring-intents` · `pso-20260619-axiom-paintbox-parity-standards-alignment` (Tier B)  
**Supersedes:** Ad-hoc Forge-only preview scaling that diverges from Hails compose for the same `visual.scale`.

---

## Problem

The Forge UX fixes (TV size envelope, chip strip below paintbox, form dedupe, S/M/L package sizing) risk **two preview systems** unless we explicitly unify them:

| Surface | Intent | Today | Risk if Forge-only |
| --- | --- | --- | --- |
| **Hail Forge → Glyphs** | `glyph` | Centered anchor; Glyph focus vs TV size | TV size uses different math than Hails |
| **Hail Forge → Effects** | `effect` | Centered reference glyph + effect hero | Chip strip layout diverges from stack contract |
| **Hails edit** | `compose` | `placement_id` anchor; always full composed hail | Unchanged layout; size tier already on loadout chips |

**Saved intent is clear:** one consumer stack, three **authoring intents** — not three renderers. Forge and Hails differ in **hero, anchor, and view filters**, not in delivery geometry.

---

## Reconciliation principle (locked)

### One delivery model, two presentation modes

```text
                    ┌─────────────────────────────────────┐
                    │  derive-preview → render_payload      │
                    │  (sole glyph projection — all surfaces) │
                    └─────────────────────────────────────┘
                                        │
          ┌─────────────────────────────┼─────────────────────────────┐
          ▼                             ▼                             ▼
   authoringIntent: glyph      authoringIntent: effect      authoringIntent: compose
   (Forge Create)               (Forge Create)               (Hails Assemble)
          │                             │                             │
          ├─ Glyph focus (design)       ├─ Effect hero                ├─ Always delivery
          └─ TV size (delivery)         └─ Glyph reference toggle     └─ placement_id anchor
```

| Scale mode | Surfaces | Anchor | Envelope | Glyph scale |
| --- | --- | --- | --- | --- |
| **`delivery`** | Hails `compose` (always); Forge `tv-size`; Effect Forge reference | placement (compose) or center (forge) | `PAINTBOX_TIERS` fractions from `visual.scale` | `glyphVisualFraction` inside envelope |
| **`design`** | Forge **Glyph focus only** | center | Full paintbox (no tier box shrink) | ×1.35 legibility boost on mark |

**Rule:** For identical draft state (`visual`, glyph, message, effect), **Forge TV size ≡ Hails edit preview** except anchor position (`placement_id` vs centered). Operator must not see a different package size on Forge TV size than on Hails for the same S/M/L chip.

**Hails edit does not get Glyph focus / TV size toggles** — it is permanently in **`delivery`** mode per `hails-render-parity-v001.md` §5.1 (composed hail as TV would consume it).

---

## Shared stack contract (both surfaces)

Extract from `HailRegistryAuthoringPreviewStack` — **one layout shell** for Forge and Hails:

```text
[data-hail-registry-authoring-preview-stack]
  [data-hail-authoring-preview-viewport]     ← fixed 18×16rem, never flex-shrinks
    HailPaintboxPreview
  [data-hail-authoring-preview-chips]         ← NEW: chip strip below viewport
    intent-specific layer toggles
  (optional) recipe / family label             ← Forge glyph only, above or in chips
```

| Region | Forge Glyph | Forge Effect | Hails compose |
| --- | --- | --- | --- |
| Viewport | Fixed 18×16rem | Fixed 18×16rem | Fixed 18×16rem |
| Chips below | Design view · TV size · Effect · Message · Shell · Regenerate · Reset | Glyph · Shell | Effect · Message · Shell |
| Loadout column | Size · Color · Effect · Variation (unchanged) | Same + tuning | Same |
| Anchor | center | center | `placement_id` |
| Default scale mode | `design` (Design view) | `delivery` | `delivery` |

Message and Shell chips on Glyph Forge are always shown (not gated to TV size). Effect Forge has no Effect chip — motion is always on.

**Prohibited:** Controls above the viewport that change row height and push the paintbox down.

---

## Implementation plan (integrated)

### 1. TV size glyph too small → unified tier envelope

**Solution:** Introduce shared helper (e.g. `hailAuthoringTierEnvelope.ts`) sourced from `PAINTBOX_TIERS` / `size-tier-semantics-v001.md`:

- Compute envelope `width%` / `height%` from `visual.scale` inside the fixed viewport.
- Size glyph via `glyphVisualFraction` within that envelope.
- Apply in **`delivery`** mode for: Forge `tv-size`, Hails `compose`, Effect Forge reference glyph.
- **Do not** apply envelope shrink in Forge **`design`** (Glyph focus) — full box for legibility.

**Files:** `hailAuthoringPreviewLayout.ts`, `HailPaintboxPreview.tsx`, new tier envelope module; update `paintbox-authoring-chrome-v001.md` scale table.

### 2. Controls above preview → chip strip below (shared stack)

**Solution:** Refactor `HailRegistryAuthoringPreviewStack`:

1. Viewport first (fixed `minWidth` / `minHeight` from `hailAuthoringPreviewDimensions()`).
2. Chip strip immediately below — reuse `HailLoadoutPresets` chip styling (`chipClass` pattern).
3. Move `HailAuthoringPreviewControls` into strip; surface-specific chip sets per table above.

**Hails:** Effects toggle moves from above paintbox to chip strip (same component, `surface="studio"`).  
**Forge:** All layer toggles in strip; recipe line optional chip or muted text in strip.

**Files:** `HailRegistryAuthoringPreviewStack.tsx`, `HailAuthoringPreviewControls.tsx`, CSS if needed.

### 3. Redundant section under Regenerate → single editor path

**Solution:** Slim `HailGlyphCreatorPanel` to glyph-authoring-only:

- Keep: Regenerate, Reset, Animation enabled, Speed, Transition.
- Remove: duplicate Palette / Motion / Size dropdowns and duplicate Glyph name field.

Loadout chips (`HailLoadoutPresets`) remain the **only** control for Size / Color / Effect / Variation on Forge and Hails.

**Files:** `HailGlyphCreatorPanel.tsx`, `HailForgeGlyphWorkspace.tsx` (single name field + Save).

### 4. Package Hail resize (S / M / L) → one SoT, both surfaces

**Solution:** `visual.scale` remains catalog SoT (`size-tier-semantics-v001.md`).

- Loadout **Size** chips already PATCH `visual.scale` on save.
- Wire **`delivery`** preview to tier envelope so S/M/L visibly resizes the **package** in both Forge TV size and Hails compose.
- Optional: duplicate Size chips in preview strip labeled **Hail size** — same handler as loadout column (no second state).

**Parity check:** Same `visual.scale` + loadout on Forge TV size and Hails edit must produce matching envelope and glyph fraction (placement offset excepted).

### 4. Hail package binding (slices H1–H3)

**Problem:** Glyph SVG shrink-wrap sized the effect envelope; transporter beam centered on canvas, not package.

**Solution:** `data-hail-package` fills the tier anchor box; `data-hail-effect-layer` and `data-hail-glyph-layer` stack with `inset: 0`. Transporter canvas measures package bounds and anchors beam at `HAIL_PACKAGE_ANCHOR`.

**Doc:** `hail-authoring-package-v001.md`

**Standards alignment (Tier B):** `paintbox-parity-standards-alignment-v001.md` — full-package visual parity, glyph presentation, compositing hygiene. Package slices H1–H3 are **shipped**; Tier B is **active**.

### 5. Addendum — Forge / Hails reconciliation (this document)

**Solution:** Centralize scale-mode resolution:

```ts
// authoringScaleModeForSurface(intent, tvSizeView)
// compose | effect     → "delivery" always
// glyph + tvSizeView   → "delivery"
// glyph + !tvSizeView  → "design"
```

- Remove compose-vs-forge branching in tier math; branch on **`delivery` vs `design`** only.
- Hails `HailStudioEditPanel` passes `authoringIntent="compose"` — implicitly `delivery`; no new toggles.
- Verifiers: assert Forge `tv-size` and Hails `compose` share tier envelope helper; assert chip strip is below viewport on both surfaces.

**Files:** `hailAuthoringIntent.ts`, verifiers, this doc + cross-links in `forge-authoring-intents-v001.md` § Hails edit.

---

## What stays different (by design)

| Dimension | Forge | Hails |
| --- | --- | --- |
| Hero | Glyph or effect asset | Full composed hail |
| Anchor | Centered | `placement_id` |
| View modes | Glyph focus + TV size | Delivery only |
| Message default | Hidden until Message chip (glyph); none (effect) | On when Message chip on |
| Effects default | Off (new glyph) | Operator choice |
| Persisted toggles | None (view filters) | None (view filters) |

These differences are **intent**, not **geometry**.

---

## Verification

```bash
cd frontend && npm run build
node scripts/verify-hails-forge-authoring-intents-v001.mjs
node scripts/verify-hails-paintbox-authoring-chrome-v001.mjs
node scripts/verify-hails-render-parity-v001.mjs
```

**Manual parity:** On Forge, set loadout to Medium + Transporter; open TV size. On Hails, same glyph + loadout. Package envelope and glyph fraction should match; only vertical position differs (center vs placement). Compare at **stable** phase for Tier B — see `paintbox-parity-standards-alignment-v001.md`.

---

## Related

- `paintbox-parity-standards-alignment-v001.md` — Tier B gates, standards map, slices I1–I5
- `paintbox-authoring-chrome-v001.md` — DOM + viewport lock
- `forge-authoring-intents-v001.md` — three intents
- `size-tier-semantics-v001.md` — S/M/L contract
- `hails-render-parity-v001.md` §5.1–5.2

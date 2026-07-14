# Hail Forge v001 — implementation companion

**Fleet authority:** `docs/hails/hails-authority-v001.md` — Forge is an Axiom CRUD surface for Glyphs and Effects.  
**Praxis doctrine:** `AptlyClever/praxis:objects/doctrines/axiom-hail-forge-v001.md`  
**Preview UX (active):** `docs/hails/forge-authoring-intents-v001.md` · `pso-20260617-axiom-forge-authoring-intents`  
**Campaign:** `AptlyClever/praxis:objects/hails/20260614-axiom-hail-forge-campaign-pso-001.md`  
**Page templates:** `AptlyClever/praxis:objects/doctrines/axiom-hails-page-template-bindings-v001.md` · `docs/hails/page-template-bindings-v001.md`

This document is the repo-local companion for Hail Forge work. Praxis doctrine wins on product decisions.

## Scope

Split **operate a Hail** (`#/axiom/hails`) from **author Glyphs and Effects** (`#/axiom/hails/forge`).

**Create → Assemble → Display:** Forge authors reusable Glyphs/Effects; Hails page assembles; TV consumes `derive-preview` payload.

### Hails page (operator)

- Animated preview when Effects enabled (browse band).
- Static edit row: preview + Size / Color / Effect chips (`authoringIntent: compose`).
- No Effect fine-tune sliders on loadout.
- No registry honesty, capability badges, or “Needs a look” on main surfaces.
- Single **Hail Forge** header link.

### Hail Forge (author)

- Full-page route (Slice 2+).
- Library: **Glyphs** | **Effects** (archived glyphs hidden from default list).
- Workspace: `HailRegistryAuthoringPreviewStack` + loadout; **`authoringIntent`** per workspace (see `forge-authoring-intents-v001.md`).
- Glyph workspace: glyph-focus preview; Effects default Off on New Glyph.
- Effect workspace: effect-focus preview; glyph reference + show/hide; Effects default On.
- Effect tuning sliders and Glyph CRUD live here.

## Naming

| Canon | Never use on operator UI |
| --- | --- |
| Glyph | Icon |
| Effect | Look |
| Hail Forge | Glyph Forge (display), “New look” |

## Data model (unchanged from effect-registry)

```json
"visual": {
  "effect_id": "transporter",
  "effect_tuning": { "beam_intensity": 0.78 },
  "palette_id": "axiom_dark_cyan",
  "scale": "medium"
}
```

- **Effect** — registry entry + tuning schema.
- **Effect preset** — gallery snapshot (Effect + default Size / Color / placement); starter only.

## Implementation slices

| Slice | Status | Key files |
| --- | --- | --- |
| 1 — Hails theme repair | complete | `HailBrowseProofPanel.tsx`, `HailLoadoutPresets.tsx`, `HailsView.tsx`, … |
| 2 — Forge page | complete | `HailForgeView.tsx`, `hail-forge/*`, routing |
| 3 — Effect preset CRUD | complete | `hail_effect_presets_library.py`, `HailForgeEffectWorkspace.tsx` |
| 4 — Authoring intents (Optimal) | active | `forge-authoring-intents-v001.md`, `hailAuthoringIntent.ts`, `HailAuthoringPreviewControls.tsx` |

## Verifiers

- `verify-hails-forge-authoring-intents-v001.mjs` — intent props + Forge defaults
- `verify-hails-effect-registry-preview-v001.mjs` — browse preview policy
- `verify-hails-effect-registry-tuning-v001.mjs` — tuning helpers (customize gated off on Hails)
- `verify-hails-studio-g-glyph-forge.mjs` — Forge entry points
- `verify-hails-render-parity-v001.mjs` — consumer glyph path

## Related

- `docs/hails/forge-authoring-intents-v001.md`
- `docs/hails/effect-registry-v001.md`
- `docs/hails/studio-e-edit-wireframe-acceptance.md`

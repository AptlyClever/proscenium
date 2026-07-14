# Forge authoring intents v001 (Optimal)

**Status:** **Active implementation authority** for Hail Forge preview UX.  
**Praxis:** `AptlyClever/praxis:objects/hails/20260617-axiom-forge-authoring-intents-pso-001.md`  
**Render parity:** `hails-render-parity-v001.md`  
**Glyph doctrine:** `glyph-hero-intent-v001.md`  
**Effect doctrine:** `effects-enhancement-v001.md`, `animation-language-v001.md`

---

## Purpose

Lock **Create → Assemble → Display** preview behavior:

| Stage | Surface | Job |
| --- | --- | --- |
| **Create** | `#/axiom/hails/forge` | CRUD Glyphs and Effects with **live preview of the asset being edited** |
| **Assemble** | `#/axiom/hails` | Pick saved glyph, message, loadout, route |
| **Display** | Google TV / LCARD | Consumer payload from `derive-preview` / effective |

Forge is useless if **Create** does not show the glyph or effect being authored. This doc defines **how** Forge previews differ while sharing one consumer stack.

---

## One stack, three intents

```text
draft state → POST derive-preview { record, custom_glyphs? }
            → render_payload (google_tv)
            → HailPaintboxPreview (authoringIntent filters chrome + defaults)
```

| `authoringIntent` | Surface | Preview hero |
| --- | --- | --- |
| `glyph` | Forge → Glyphs | **Glyph** (`glyph_render`) |
| `effect` | Forge → Effects | **Effect** choreography (glyph = reference) |
| `compose` | Hails edit | **Composed hail** |

**Not allowed:** second glyph renderer, client-side `procedural_graph` draw after derive-preview, or masking `custom-*` as `default`.

**Paintbox chrome (locked):** `paintbox-authoring-chrome-v001.md` — **18×16rem** viewport always; Design view and TV size scale inward only.

---

## Glyph Forge (`authoringIntent: glyph`)

**Doctrine:** Glyph is the **main character** of the Hail (`glyph-hero-intent-v001.md`). Hero preview = mark **large enough to judge**.

| Control | Default (New Glyph) | Behavior |
| --- | --- | --- |
| Preview viewport | **Fixed 18×16rem** | Never resizes between modes |
| **Design view** | **On** (default) | Mark **centered**, scaled up for legibility (design mode) |
| **TV size** | Off | Same box; mark at **delivery scale** (zoomed in to TV size) |
| Effect toggle | **Off** | Motion suppressed; static glyph readable |
| Message / Shell | Off (preview) | Always available via chips — not gated to TV size |
| Regenerate / Reset | Preview chip row | H3.5 `slot_*` families |
| Animation / Speed / Transition | Loadout column (motion section) | Persists on glyph spec |

Layer toggles: **Design view** · **TV size** · **Effect** · **Message** · **Shell** · **Regenerate** · **Reset**. Motion loadout: **Animation** · **Speed** · **Transition**. Chip catalog: `preview-chip-sets-v001.md`.

**Placement in Glyph Forge:** glyph and effect envelope are **centered** in the paintbox (not `upper_center` loadout placement). Hails edit (`compose`) still uses `placement_id`.

---

## Effect Forge (`authoringIntent: effect`)

**Addendum:** Effects are **not** the hero of the Hail — but they **are** the hero of **Effect Forge**.

| Concept | Hail delivery | Effect Forge authoring |
| --- | --- | --- |
| Glyph role | Identity — main character | **Reference prop** (default or picked) |
| Effect role | Frames the glyph | **Primary subject** of preview |
| Effect-as-hero anti-pattern | Empty mark + heavy transporter on **TV** | Invalid on **TV size** view; allowed to **hide glyph** while tuning motion in Effect Forge |

| Control | Default | Behavior |
| --- | --- | --- |
| Effect motion | **Always on** | No Effect chip — motion is the subject |
| Glyph toggle | **On** | Hide `[data-hail-glyph-artwork]` to inspect pure envelope |
| Message layer | **Off** | No Message chip; effect name must not render as hail copy |
| Shell toggle | **On** | Optional compose-style frame when tuning |
| Glyph scale | Reference (smaller than design view) | Subordinate to effect envelope |
| Tuning sliders | Forge-only | Unchanged |

---

## Hails edit (`authoringIntent: compose`)

Unchanged from `hails-render-parity-v001.md` §5.1 — full composed hail. Chip strip: **Effect** · **Message** · **Shell** (same preview stack geometry as Forge; intent-appropriate chips only).

**Unified preview plan:** `paintbox-authoring-preview-unified-plan-v001.md` — Forge TV size and Hails compose share **`delivery`** tier envelope math; Forge Glyph focus alone uses **`design`** legibility mode. Chip strip below fixed viewport applies to both surfaces.

---

## Generation checkpoint (H3.5)

| Path | Use |
| --- | --- |
| **H3.5 `slot_{field}_{charge}`** | **Only** new Forge seeds / Reset |
| **H3 `compose_*`** | Saved glyphs; explicit variation regen |
| **H2 `hero_*`, fragments** | Saved glyphs only |
| **Registry** (`default`, …) | Retired — not Forge templates; **deprecated** in registry JSON; compose picker shows `default` + `custom-*` only |

Module: `backend/hail_glyph_slots.py` (+ `layout_id` variation on Regenerate).

---

## Supersedes (repo docs)

| Document | Superseded section | Replacement |
| --- | --- | --- |
| `hail-forge-v001.md` | “Reuse identical workspace preview” | This doc § One stack |
| `effects-enhancement-v001.md` | “Mirror same renderer” without intent split | § One stack |
| `glyph-composition-direction-v001.md` §5–7 | H3 `compose_*` as new-seed path | § Generation checkpoint |
| `glyph-inventory-v001.md` | New seeds `compose_*` | § Generation checkpoint |
| `axiom-hails-forge.v001` template | Single footprint both workspaces | Intent-specific defaults (template note) |

---

## Implementation map

| File | Role |
| --- | --- |
| `frontend/src/hailAuthoringIntent.ts` | Intent types + default toggles |
| `frontend/src/hailAuthoringPaintboxChrome.ts` | Locked viewport chrome + placement anchor |
| `frontend/src/hailAuthoringPreviewLayout.ts` | Viewport sizes per intent |
| `frontend/src/components/HailAuthoringPreviewControls.tsx` | Effects + Glyph focus / TV size toggles |
| `frontend/src/components/HailRegistryAuthoringPreviewStack.tsx` | Pass intent + toggles |
| `frontend/src/components/HailPaintboxPreview.tsx` | Intent-specific layout |
| `frontend/src/components/hail-forge/HailForgeGlyphWorkspace.tsx` | `glyph` intent |
| `frontend/src/components/hail-forge/HailForgeEffectWorkspace.tsx` | `effect` intent |

---

## Verification

```bash
cd frontend && npm run build
node scripts/verify-hails-forge-authoring-intents-v001.mjs
node scripts/verify-hails-paintbox-authoring-chrome-v001.mjs
node scripts/verify-hails-render-parity-v001.mjs
```

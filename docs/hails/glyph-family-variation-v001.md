# Glyph family and variation v001

**Status:** Implemented companion (Forge + Composer seed API).  
**Authority:** `docs/hails/hails-authority-v001.md`  
**Locked direction:** `glyph-composition-direction-v001.md`  
**Related:** `glyph-generation-standard-v001.md`, `glyph-hero-intent-v001.md`, `custom-glyph-library-v001.md`, `effect-registry-v001.md` (family + tuning pattern)

---

## Problem

Procedural Forge marks (PRs #134–#135) maximized **per-seed uniqueness**. Regenerate re-rolled recipe family, stacked unrelated primitives (~44% `primitive_compose`), and often appended a second full generator (~36%). Marks felt like random object piles — not emblems in a coherent visual family.

Product intent (`glyph-composition-direction-v001.md`, `glyph-hero-intent-v001.md`): a glyph is the **main character** of a Hail — a **composed emblem** that reads as one character, original and recognizable, not a random collage or lone primitive.

---

## Design (mirrors Effect registry)

| Layer | Effect analogue | Glyph analogue | Regenerate behavior |
| --- | --- | --- | --- |
| **Family** | `effect_id` | `glyph_family_id` / `procedural_graph.generator_id` | **Locked** |
| **Variation** | `effect_tuning` + choreography params | `seed` + parametric jitter inside recipe | **Changes** |
| **Loadout** | Size / palette on hail `visual` | Forge Size / Color / Effect | **Preserved** (unchanged) |

**Regenerate** = new variation **inside** the current family.  
**Reset** (and first seed for a new glyph) = may pick a **new** family from the semantic bucket.

No new Forge UI in v001 — behavior change only.

Family coherence **necessary**; **composed emblem** quality **still required** — see **`glyph-composition-direction-v001.md`**. H2 single-stroke families are **legacy only** for saved glyphs.

---

## Family IDs

Valid `glyph_family_id` values for **new** Forge seeds are **H3.5** slot recipes (`slot_{field}_{charge}`, e.g. `slot_shield_bolt`) from `hail_glyph_slots.py`. **H3** monolithic `compose_*` grammars remain valid for **saved** glyphs and variation-only regen. **H2** hero archetypes (`hero_orb`, `hero_spire`, …) remain valid for **saved** glyphs only.

Composition families (legacy monoliths — saved glyphs / explicit variation regen):

- `compose_circle_star`, `compose_lozenge_bolt`, … (nine total)

Slot recipes (new Forge seeds / reset):

- `slot_{field}_{charge}` — fields: `shield`, `orb`, `lozenge`, `band`, `crest`; charges: `star`, `bolt`, `chevron`, `spire`, `flame`, `wing`, `ray`, `diamond`, `hook`, `gem` (50 curated pairs). Field and charge share one optical anchor so the emblem reads as **one character**, not two floating parts.

**Reset / new seed:** flat pick across all 50 slot recipes (not bucket-biased) so silhouettes spread across the catalog.  
**Regenerate:** same `slot_*` recipe; wider parametric ranges (scale, posture, stroke, charge mirror/variant) plus **`layout_id`** (`integrated` | `charge_forward` | `inscribed`) for silhouette variety inside the family.

Interim hero templates (saved glyphs only) — **do not add** new H2 templates:

- `hero_orb`, `hero_lozenge`, `hero_spire`, `hero_wedge`, `hero_loop`, `hero_flame`, `hero_arch`

Deprecated first-pass ids (`hero_spire`, `hero_eye`, …) alias forward for saved glyphs only. **Do not add** new H2 templates.

Legacy fragment families (saved glyphs only):

- Named recipes: `arc_eye`, `chevron`, `diamond_core`, `lookout`, … (14 recipes in `hail_glyph_procedural.py`)
- `primitive_compose` — deprecated for new seeds

Semantic **bucket** (`sense`, `motion`, `signal`, `gather`, `spark`, `neutral`) still biases **initial** family selection only.

---

## API

`POST /api/hails/composer/seed-glyph`

| Field | Purpose |
| --- | --- |
| `glyph_name`, `hail_name`, `seed` | Unchanged |
| `scale`, `palette_id`, `effect_id` | Loadout hints for new specs |
| `glyph_family_id` | Optional. When set with `variation_only`, render only this family |
| `variation_only` | `true` on Regenerate — lock family, vary geometry |

Response includes `glyph_family_id` (top-level, mirrors `procedural_graph.generator_id`).

---

## Generation rules (v001)

1. **Initial / Reset** — pick family: ~15% `primitive_compose`, else bucket-weighted recipe; accents are **dot-only** (no second generator).
2. **Regenerate** (`variation_only` + `glyph_family_id`) — same family, new `seed`; `primitive_compose` uses **one** primitive; accents dot-only at low probability.
3. **Standards** — unchanged: 48×48 grid, ≤3 paths, ≤2 circles, `is_valid_procedural_graph`, composer validation.

---

## Hail cycle compatibility

| Step | Impact |
| --- | --- |
| Forge / Hails Paintbox preview | Renders `procedural_graph` paths — unchanged |
| Save glyph (`register-glyph` / `PATCH`) | Persists `glyph_family_id` + graph |
| New Hail / edit hail with `custom-*` | `icon.value` only — unchanged |
| `derive-preview` / effective LCARD | Consumer `glyph_render` in payload — Google TV parity per **`hails-render-parity-v001.md`** |

---

## Implementation scope (focused pass)

**In scope**

- `backend/hail_glyph_procedural.py` — family lock, safer accents, compose caps
- `backend/hails_composer.py` — seed params + `glyph_family_id` on spec
- `backend/main.py` — seed-glyph body passthrough
- `frontend` — `composerSeedGlyph`, `mergeRegeneratedGlyphSpec`, `HailForgeGlyphWorkspace` regenerate/reset wiring (no layout/copy changes)
- Tests + `verify-hails-glyph-procedural-forge-v001.mjs` family assertions

**Out of scope**

- Forge UI redesign, new buttons, workbench promotion
- LCARD/Android procedural projection
- Registry bundled glyph changes

---

## Verification

```bash
cd backend && python3 -m pytest tests/test_hail_glyph_procedural.py tests/test_hails_composer.py -q
node frontend/scripts/verify-hails-glyph-procedural-forge-v001.mjs
```

Manual: Hail Forge → New Glyph → Regenerate (same family feel) → Reset (may change family) → Save; Hails page preview still renders mark.

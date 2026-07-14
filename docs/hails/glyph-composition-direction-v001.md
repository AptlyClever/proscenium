# Glyph composition direction v001 (locked)

**Status:** **Locked generator grammar** — field/charge slot rules; **not** product essence (see **`doctrine-hail-glyph-essence`**).  
**Authority:** `docs/hails/hails-authority-v001.md`  
**Operator essence:** `doctrine-hail-glyph-essence` — stylized **subject**, style, representation kinds.

---

## 1. What we are building

A **Glyph** is a **stylized subject** — the Hail’s identity mark. It must read as **one thing** on the Paint Box beat (face, prop, planet, creature, sigil, …).

Operator vocabulary: **subject**, **style**, **Glyph Hero**. This doc uses **field**, **charge**, **emblem** for **H3.5 slot grammar only** — one authoring path, not the product definition.

**Composition** means **structured hierarchy**, not:

- a random pile of unrelated strokes,
- a single bare geometric primitive with no character,
- a copy of a legacy registry/test glyph.

**One character** means the viewer names **one lead** at TV distance — even when built from 2–4 integrated sub-shapes (e.g. slot ground + focal accent, not separate floating fragments).

---

## 2. Canonical generation model (H3 target)

| Slot | Role | Example |
| --- | --- | --- |
| **Field** | Ground / frame the charge sits on | circle, shield, lozenge, band |
| **Charge** | Primary focal symbol | star, bolt, crest, creature silhouette, spire-with-mass |
| **Ordinary** (optional) | Structural divider attached to field | bar, chevron, cross — not a floating fragment |
| **Mark** (optional) | Subordinate accent **on** the charge/field | dot, tick, ring — never a second unrelated subject |

**Seed / name** bias bucket → composition grammar → parametric variation inside that grammar.

| Operator action | Behavior |
| --- | --- |
| **Regenerate** | Same composition grammar (`glyph_family_id`), new parametric pose (`seed`) |
| **Reset** | May select a new grammar / family |
| **Save** | Persist `procedural_graph` + `glyph_family_id` on the custom glyph spec |

We are **not** locked to the current Python procedural engine. We **are** locked to:

- `procedural_graph` storage and Forge Paintbox preview,
- `glyph-generation-standard-v001.md` constraints (48×48, ≤3 primary paths + optional halo, monochrome, TV distance),
- consumer payload carrying **`glyph_id`** and **`glyph_render`** for Google TV parity

**Target implementation:** `backend/hail_glyph_composition.py` (or equivalent) — **blazon / slot composer** with validity gate (reject low ink mass, disconnected parts, collage). Optional later: LLM proposes composition spec → deterministic SVG renderer.

---

## 3. TV / Hail impact (non-negotiable)

Forge quality is insufficient if the mark does not affect delivery.

| Axiom Paintbox | Renders `glyph_render` from consumer payload | Same path as Google TV |
| Consumer render payload | `glyph_id` + **`glyph_render`** + `render_target` | LCARD adapter → overlay APK |
| Google TV APK | Registry drawables + **runtime procedural** from `glyph_render` | Arcade / Master Bedroom |

See `control-alt-lcard/service/config/hail-overlay-glyph-allowlist.js` — `custom-*` is deliverable when `glyph_render` carries a valid procedural graph; registry ids use baked drawables.

**H4 (TV parity):** **H4a** runtime parity via `glyph_render` (shipped). **H4b** registry vector promotion (optional). See **`glyph-hero-intent-v001.md`** §7.

---

## 4. Superseded approaches — do not revert

| Approach | Era | Why superseded | Agent rule |
| --- | --- | --- | --- |
| **Primitive roulette** (`primitive_compose`, stacked generators, accent second generator) | PRs #134–#135 | Random object piles, not emblems | Do not re-enable for new seeds |
| **Fragment recipes** (`orbit_ticks`, `arc_eye`, …) as default Forge output | Pre-hero | Diagram aesthetics | Legacy saved glyphs only |
| **H2 single-stroke hero templates** (`hero_orb`, `hero_spire`, … one path each) | Current shipping interim | Produces lines/ovals, not composed characters | **Transitional** — do not add templates or invest in tuning; replace with H3 composer |
| **Registry/test glyphs as Forge templates** (`hero_spire` clones, copies of seed marks) | H2 first pass | Wrong product goal | Aliases only for saved ids |
| **Doctrine: “if the answer needs ‘and,’ it is not a Hero Glyph”** | H1 `glyph-hero-intent` | Conflicts with composed emblem | Replaced by **“one emblem, multiple integrated parts”** |
| **Effect-as-hero** (empty mark + heavy transporter) | — | Glyph must carry identity | Still invalid |
| **Axiom-only custom glyphs with no TV plan** | Pre-direction | Split preview vs living-room impact | Invalid for “done” — require H4 path |

---

## 5. Roadmap (authoritative slices)

| Slice | Status | Notes |
| --- | --- | --- |
| **H1 — Doctrine** | Superseded by this doc + updated `glyph-hero-intent-v001.md` | H1 single-noun rule retired |
| **H2 — Hero templates** | **Legacy saved glyphs only** | Not used for new Forge seeds |
| **H3 — Composition composer** | **Legacy saved glyphs** (`compose_*`) | Explicit variation regen only |
| **H3.5 — Slot composer** | **Shipped** (`hail_glyph_slots.py`) | **Only** new Forge seeds / Reset — `slot_{field}_{charge}` |
| **H4 — TV parity** | **H4a** runtime (`glyph_render`) shipped; **H4b** registry promotion optional | See `glyph-hero-intent-v001.md` §7 |
| **Forge authoring intents** | **Shipped** (`forge-authoring-intents-v001.md`) | Glyph-focus Create UX; same consumer stack |

**Supersedes:** §5–7 prior text that listed H3 `compose_*` as the new-seed path. See `forge-authoring-intents-v001.md` § Generation checkpoint.

---

## 6. Implementer checklist

Before merging glyph generation changes:

- [ ] Output is a **composed emblem**, not a lone primitive or random collage
- [ ] Passes **generation standard** (grid, path budget, monochrome)
- [ ] **Regenerate** locks composition grammar; **Reset** may change it
- [ ] **New Forge seeds** use **H3.5 `slot_*`** only — not `compose_*`, fragments, or registry copies
- [ ] No extension of **H2 single-path templates** without operator approval
- [ ] Docs updated if behavior or doctrine shifts
- [ ] TV impact considered (preview-only is explicitly interim)
- [ ] Forge preview uses **`authoringIntent: glyph`** defaults (Effects Off on New Glyph)

---

## 7. Related code (current)

| Module | Role |
| --- | --- |
| `backend/hail_glyph_slots.py` | **H3.5** slot seeder for **new** Forge seeds |
| `backend/hail_glyph_composition.py` | **H3** composed emblem — saved `compose_*` families |
| `backend/hail_glyph_hero_templates.py` | Legacy H2 — saved `hero_*` families only |
| `backend/hail_glyph_procedural.py` | Family lock, legacy recipes |
| `backend/hails_composer.py` | `seed-glyph`, `glyph_family_id`, `variation_only` |
| `frontend/src/hailAuthoringIntent.ts` | Forge preview intent + layer toggle defaults |
| `frontend/src/components/HailPaintboxPreview.tsx` | Consumer payload preview (no parallel glyph renderer) |

---

## See also

- `AptlyClever/praxis:objects/hails/20260616-axiom-glyph-composition-h3-pso-001.md` — active Praxis campaign (operator ground truth)
- `docs/hails/glyph-hero-intent-v001.md` — operator-facing definition
- `docs/hails/glyph-family-variation-v001.md` — Regenerate / Reset semantics (still valid)
- `docs/hails/custom-glyph-library-v001.md` — My Glyphs storage
- `docs/hails/hails-runtime-readiness-audit-v001.md` — custom glyph TV gaps

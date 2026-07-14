# Glyph hero intent v001

**Status:** Implementation mirror (operator §4 detail, TV parity, checklist).  
**Canonical essence:** Praxis **`doctrine-hail-glyph-essence`** → `docs/praxis/hail-glyph-essence-px001.md`  
**Canonical style:** Praxis **`doctrine-hail-glyph-hero-style`** → `docs/praxis/hail-glyph-hero-style-px001.md` (proto reference mood; mood lanes planned)  
**Terminology:** Prefer **Glyph Hero** (legacy code alias **Hero Glyph**).  
**Locked generation rules:** `glyph-composition-direction-v001.md` — **grammar only**; do not treat slots as product essence.

---

## 1. What a Glyph is

A **Glyph** is the **main character** of a Hail.

It is the identity **mark** the household notices in the Grid — the **lead** of the moment — before message copy or effect choreography finishes the beat. One Hail, one Glyph: **one integrated character** at Paint Box and TV distance.

A Glyph is **not**:

- a lone geometric primitive (plain oval, bare line, empty spire),
- a diagram fragment or UI ornament,
- a random collage of unrelated strokes,
- an emoji reaction,
- a copy of an older test or registry mark,
- the effect itself (transporter, pop, and peers **frame** the hero; they do not replace it).

---

## 2. Glyph Hero — definition

A **Glyph Hero** is a Glyph that clears the **hero tier**: composed stylized subject with clear focal read, TV legibility, and operator §4 — at medallion and Paint Box scale (~40–96dp).

*(Legacy alias in code and filenames: **Hero Glyph**.)*

| Criterion | Meaning |
| --- | --- |
| **One lead** | One **subject** phrase at thumbnail distance (e.g. “guardian,” “combadge,” “panda,” “Mars beacon”) — integrated silhouette, not “this stroke and that dot.” |
| **Integrated structure** | 2–4 parts with hierarchy (ground + focal accent at minimum). Not a pile; not a single empty shape. |
| **Easily recognizable** | Distinct in a row of six thumbnails; interesting, not generic filler. |
| **Original** | Forge-generated marks are **new fleet characters** — not copies of `default` or other legacy test assets. |
| **Defined & unique** | Stable per saved glyph; **Regenerate** varies pose inside the same grammar; **Reset** may change grammar. |
| **Focal mass** | Ink in a coherent center-weighted silhouette (~26×26 optical box in 48×48). |
| **TV distance** | Legible on a living-room display; survives `small` size tier. |
| **Monochrome discipline** | `currentColor` paths; palette and effect carry mood. |

**Hero preview** (Hails Studio, Hail Forge) means the Paint Box shows the character **large enough to judge** — the Glyph is the star of that frame.

### Implementer note — grammar vocabulary

Docs and code may say **emblem**, **field**, **charge**, or **blazon**. That is **generator grammar** (H3.5 slot composer), **not** the product category. A Glyph Hero may depict a face, prop, planet, creature, or sigil — see **`doctrine-hail-glyph-essence`** for representation kinds. Do not require “coat of arms” aesthetics in operator review.

### Fleet Soul v1 checklist (style — `doctrine-hail-glyph-hero-style`)

When judging §4 under **proto**:

1. **One outer hull** — single silhouette; no floating fragments as subject.
2. **Monolith mass** — solid ink, not hairline blazon.
3. **One phrase** — subject name, not parts list.
4. **Kind read** — Places / People / Characters generator, not default slot roulette.

Forge Reset policy: **`glyph-forge-seed-policy-v001.md`**.

---

## 3. What is *not* the model

| Asset / approach | Role today | Hero Glyph model? |
| --- | --- | --- |
| `default` and other early registry marks | Legacy **test / proof** assets | **No** — not templates for new Forge heroes |
| Other bundled registry glyphs | Legacy allowlist | **No** — **upgrade or remove**; not templates for new heroes |
| H2 single-stroke templates (`hero_spire`, …) | Legacy saved families only | **No** for new seeds |
| Fragment recipes (`orbit_ticks`, …) | Retired for new seeds | **No** — diagram aesthetics |
| Primitive roulette (`primitive_compose`) | Retired for new seeds | **No** — random piles |

**Hero Glyph** is the quality bar for **new** authored marks (legacy alias; prefer **Glyph Hero**). Those sets overlap in the fleet but are not the same goal.

**Essence canon:** Praxis **`doctrine-hail-glyph-essence`** — stylized **subject** first; slot heraldry is grammar only.

**Fleet policy (`pso-20260618-axiom-glyph-hero-upgrade-or-remove`):** Legacy hails and registry test glyphs are **not migrated**. Each catalog row is **upgraded** (new hero mark + full package regen via upsert) or **removed** from the active operator catalog. Package generation is authoritative with or without the UI.

---

## 4. Feel — operator language

1. **“Who or what is this?”** — One read in a phrase; supporting strokes serve the lead, not competing subjects.
2. **“Would I cast this as the lead in a six-second TV beat?”** — Main-character energy, not clip-art filler or a bare shape.
3. **“Is this ours?”** — Original fleet character, not a knockoff of a legacy test glyph.
4. **“Does the effect serve the character?”** — Field and envelope highlight the mark; they do not substitute for it on **TV delivery**.
5. **“Will this show up on the TV?”** — Saved custom marks must reach the consumer payload (`glyph_render`); preview-only is not done.

Semantic keywords from the glyph or hail name **bias** generation grammar — they do not excuse collage or registry copies.

### Effect Forge (Create only)

In **Effect Forge**, the effect is the hero of the **authoring frame** and the glyph is a **reference prop**. That is valid for tuning motion. It does **not** override delivery rule §4.4 — an empty or illegible mark plus heavy effect on TV remains an anti-pattern (§5).

---

## 5. Anti-patterns

| Anti-pattern | Why it fails |
| --- | --- |
| **Lone primitive** | Single oval/line — no character (legacy H2 failure mode) |
| **Random collage** | Unrelated strokes with no hierarchy |
| **Registry copy** | Clones of test / seed marks |
| **Diagram fragment** | Partial arc, telemetry tick, orphan stroke |
| **Emoji-primary** | Fallback only when delivery path missing |
| **Effect as hero (TV)** | Empty or unreadable mark + heavy effect on delivery |
| **Preview-only forever** | Forge mark never reaches consumer payload / TV |

---

## 6. Forge generation

**New seeds / Reset:** H3.5 **`slot_{field}_{charge}`** families only (`hail_glyph_slots.py`).  
**Saved glyphs / Regenerate:** may use legacy `compose_*` or `hero_*` families — variation inside locked grammar.  
**Authority:** **`glyph-composition-direction-v001.md`**, **`forge-authoring-intents-v001.md`** § Generation checkpoint.

| Operator action | Behavior |
| --- | --- |
| **Regenerate** | Same `glyph_family_id` / grammar, new `seed` |
| **Reset** | May pick a new family / grammar |
| **Save** | `custom-*` + `procedural_graph` in My Glyphs |

---

## 7. Hail cycle (TV)

Custom Hero Glyphs save to Axiom (`custom-*`), attach to Hails via `icon.value`, and project to Paint Box and TV through **`glyph_render`** on the frozen package (same consumer stack as derive-preview).

| Track | Meaning | Status |
| --- | --- | --- |
| **H4a — Runtime parity** | WYSIWYG: Forge / compose preview ≡ overlay APK ink via `glyph_render` (procedural or registry drawable) | **Shipped** — operator E2E on Google TV |
| **H4b — Registry promotion** | Workbench → approved registry → baked APK `drawable/glyph_*.xml` | **Optional** — fleet packaging, not the hero definition |

A Hero Glyph is **TV-complete** when **H4a** passes. **H4b** hardens delivery; it does not define whether the mark is a hero.

---

## 8. Review checklist

- [ ] **Castable lead** — passes `verify_procedural_graph_castable_lead` (focal mass, optical anchor, ghost shield)
- [ ] **Original** — not a copy of a registry/test glyph
- [ ] **Distinct** — stands apart in My Glyphs / thumbnail row
- [ ] **TV path (H4a)** — `glyph_render` on consumer payload; overlay can draw the mark
- [ ] **Delivery hierarchy** — effect serves the character on TV (§5 clear)
- [ ] **No anti-patterns** — §5

---

## 9. Roadmap (reference)

| Slice | Status |
| --- | --- |
| **H1 — Doctrine** | Superseded — “one noun only” retired; **one character, structured parts** |
| **H2 — Hero templates** | Legacy saved glyphs only |
| **H3 — `compose_*` composer** | Legacy saved glyphs; explicit variation regen |
| **H3.5 — Slot composer** | **Shipped** — only new Forge seeds / Reset |
| **H4a — Runtime TV parity** | **Shipped** — procedural `glyph_render` on APK |
| **H4b — Registry promotion** | Optional follow-up |
| **Hero castable lead verifier** | **Shipped** — `glyph-hero-quality-v001.md`, slot catalog pytest |
| **Hero Glyph achievement path** | **Active** — `pso-20260619-axiom-glyph-hero-achievement-path`; phases A→D |
| **Glyph Hero essence (canon)** | **`doctrine-hail-glyph-essence`** — style, representation, grammar layers |
| **Hero Glyph proof (north star)** | **CI fixture** — `char_chunky_guardian_v1`, `hero-glyph-proof-v001.md`; operator sign-off = §4 + achievement path Phase D |

---

## See also

- **Praxis:** `imprint-hail-glyph-hero-compliance` — execution lock (golden path; no upsert-as-proof)
- **Praxis:** `doctrine-hail-glyph-essence` — canonical Glyph / Glyph Hero essence
- **Praxis:** `pso-20260619-axiom-glyph-hero-achievement-path` — engineering phases
- `docs/hails/glyph-composition-direction-v001.md` — locked generation + superseded table (implementer / heraldic grammar)
- `docs/hails/forge-authoring-intents-v001.md` — Glyph vs Effect Forge preview intents
- `docs/hails/studio-e-edit-wireframe-acceptance.md` — hero preview layout
- `docs/hails/effect-registry-v001.md` — effect frames the hero on delivery

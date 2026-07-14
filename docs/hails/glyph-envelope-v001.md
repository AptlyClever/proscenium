# Glyph envelope v001 — ghost shield occupancy

**Status:** Design authority (generation L0).  
**Supersedes (partial):** narrow “heraldic-only” readings of `glyph-hero-intent-v001.md`; emblem slot composer becomes one representation kind.  
**Related:** `glyph-generation-standard-v001.md`, `glyph-composition-direction-v001.md`, `glyph-hero-intent-v001.md`

---

## 1. What “unified silhouette” means

Fleet glyphs share a **ghost shield** — the median soft-heater field from H3.5 slot recipes — as an **invisible occupancy mask**:

| Layer | Locked? | Meaning |
| --- | --- | --- |
| **L0 composition zone** | Yes | Soft-heater polygon at optical center (24,24); ink must fit inside |
| **L1 render grammar** | Yes | Monochrome paths, stroke discipline (`glyph-generation-standard-v001`) |
| **L2 optical anchor** | Yes | Centroid on (24,24); hero preview stability |
| **L3 representation** | Varies | Emblem today; icon/object post-beta |
| **L4 instance** | Varies | Seed/nonce → concrete paths |

**No mandatory visible frame** on every glyph — subject freedom inside the mask (operator “C”), fleet family read from mass profile (operator “B”).

---

## 2. Implementation contract

- **Envelope id:** `ghost_shield_v1`
- **Backend:** `hail_glyph_envelope.normalize_procedural_graph_envelope()` runs after slot/compose render
- **Graph fields:** `envelope_id`; `composition.envelope = { id, visible_frame: false }`
- **Target occupancy:** hero focal mass ≥20dp longest edge (Phase C-A); envelope expanded to fit floor inside `ghost_shield_v1`
- **Post-beta:** rounder medallion mask as alternate `envelope_id` (not v001)

---

## 3. Operator UX

- **Re-encode Glyph** — increments seed with `remix: true`; explores icon/emblem mix, geometry jitter, and keyword-biased (not locked) pictograms until Save
- **Color loadout** — `visual.palette_id` tints the Glyph Focus mark at render time (`hailGlyphPalette.ts`); paths stay monochrome (`currentColor`); no re-seed required when switching palette
- Recipe / family ids are **not** shown in Forge preview chips (implementation detail)

---

## 4. Migration

| Phase | Scope |
| --- | --- |
| **v001 (now)** | Ghost shield normalizer + Try another; slot composer = emblem kind |
| **v001.1 (beta)** | Icon/object plugin — 32 pictograms, keyword-biased icon kind (~65–96%) |
| **Post-beta** | Person representation; optional medallion L0 |

Saved glyphs re-normalize on seed only; existing saved `procedural_graph` payloads remain valid until re-seeded.

# Glyph hero quality v001 — castable lead metrics

**Status:** Implementation authority (backend gates).  
**Doctrine:** `glyph-hero-intent-v001.md` §2  
**Envelope:** `glyph-envelope-v001.md` L0 occupancy

---

## Castable lead

A procedural graph is a **castable lead** when it passes `verify_procedural_graph_castable_lead()` in `backend/hail_glyph_hero_quality.py`.

| Check | Threshold | Intent |
| --- | --- | --- |
| Integrated structure | `is_valid_composition` | Field + charge; path budget |
| Charge ink | ≥1 path with opacity > 0.5 | Focal read, not frame-only |
| Path count | ≥2 | Not lone primitive |
| Charge stroke | ≥2.0 | TV legibility at small tier |
| Focal bbox max edge | ≤28 dp | Fits ~26×26 hero box in 48×48 grid |
| Optical anchor | composition anchor or centroid ±4.5 dp | Hero preview stability |
| Ghost shield fit | all ink inside mask | Fleet L0 occupancy — primary mass gate |
| Envelope id | `ghost_shield_v1` after normalize | Generation pipeline applied |

Graphs are normalized through `normalize_procedural_graph_envelope()` before measurement.

---

## Hero focal floor (Phase A — shipped)

A procedural graph meets the **hero focal floor** when it passes `verify_procedural_graph_hero_focal_floor()` in `backend/hail_glyph_hero_quality.py`.

| Check | Threshold | Intent |
| --- | --- | --- |
| Focal bbox min edge | ≥20 dp | Integrated emblem ink (interim Satisfactory gate); **not** style or §4 closure |
| Envelope id | `ghost_shield_v1` after normalize | Same pipeline as castable lead |

`verify_glyph_spec_hero_quality()` = castable lead **+** focal floor + hero grammar family + procedural `glyph_render`.

**Expected:** thin `slot_*` charges may fail focal floor; **Glyph Hero style v1** (achievement path C-C) is the product target — see **`doctrine-hail-glyph-essence`**.

---

## Delivery gate

`verify_glyph_spec_hero_quality()` = castable lead + **focal floor** + hero grammar family + procedural `glyph_render`.

`verify_enriched_package_hero_quality()` = castable lead + focal floor (via spec or payload graph) + package layout + `catalog_ready`.

---

## Verification

```bash
python3 -m pytest backend/tests/test_hail_glyph_hero_castable_lead.py backend/tests/test_hail_glyph_hero_focal_floor.py -q
npm run verify:hails-glyph-hero-quality-v001
```

Slot catalog must pass **castable lead** at seeds 1, 7, 42. **Focal floor** is enforced on seed/register/validate — current `slot_*` catalog is expected to fail until Phase C (`pso-20260619-axiom-glyph-hero-achievement-path`).

---

## Composer gates (shipped)

- **Auto-reject** — `seed-glyph` retries then 422; `register-glyph` / PATCH enforce castable lead **and focal floor**.
- **Forge save gate** — `POST /api/hails/composer/validate-glyph-hero` with proactive UI block.
- **Thumbnail distinctiveness** — `verify_glyph_thumbnail_distinctiveness()` rejects exact procedural `signature` collision vs fleet peers (register, patch, validate API).

---

## Non-goals (v001)

- Forge six-up cast-test UI
- Perceptual similarity scoring beyond exact signature collision

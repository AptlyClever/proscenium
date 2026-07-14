# Hail object inventory v001

**Ownership:** Axiom owns Hail definitions, routes, visual blocks, and effective render payloads. This inventory covers **whole Hail objects** (glyph + palette + effect + placement + size tier + animation behavior).

**Companion:** `effect-inventory-v001.md`, `animation-language-v001.md`, `catalog-render-contract-hygiene-v001.md`, `glyph-inventory-v001.md`.

**Date:** 2026-06-18 (upgrade-or-remove pass — `pso-20260618-axiom-glyph-hero-upgrade-or-remove`)  
**Issue:** AptlyClever/ctrl-alt-axiom#77

**Downstream context:** LCARD Paint Box transporter (#178), size tiers (#180), `glyph_render` consumer parity, TvOverlay retired.

**Policy:** Legacy hails are **not migrated**. Each row is **upgraded** (new hero + full package regen) or **removed** from the active catalog.

---

## Per-Hail inventory (operator catalog)

| Hail ID | Display name | Status | Route(s) | Glyph | Palette | Effect | Scale | Placement | Duration | Animation | Owner | Quality | Recommendation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `hail.away_team.001` | Away Team | **active** | arcade → away_team | `custom-away-team` | `axiom_dark_cyan` | `transporter` (`spoon`) | large | `upper_center` | 7000ms | Transporter + procedural hero | Axiom | **usable** | **keep** — Away Team device proof |
| `hail.platform_test.001` | Test | **active** | arcade → arcade; arcade → away_team | `custom-platform-test` | `axiom_dark_cyan` | `transporter` (`voyaging`) | medium | `upper_center` | 5000ms | Transporter + procedural hero | Axiom | **usable** | **keep** — living platform smoke (programmatic upsert) |
| `hail.star_trek_composed.001` | Star Trek | **active** | arcade → master_bedroom | `custom-star-trek` (`compose_ring_flame`) | operator | `transporter` | large | `upper_center` | 5500ms | Transporter + composed procedural glyph via `glyph_render` | Axiom | **usable** | **keep** — H3 emblem + TV parity path |
| `hail.spoon_transporter.001` | Spoon transporter test | **active** | operator-defined | `custom-spoon-transporter` | `axiom_dark_cyan` | `transporter` (`spoon` variation) | medium | `upper_center` | 5000ms | Transporter + procedural hero | Axiom | **usable** | **keep** — spoon variation proof with slot hero |

**Removed from active catalog:** retired sniffer / can-i-see-this proof hails (`pso-20260616-axiom-glyph-composition-h3`). Do not document as active rows.

---

## Animation behavior detail

### `hail.away_team.001`

Away Team Google TV device proof (Phase E). Large tier, yellow priority, spoon transporter variation, procedural `slot_band_ray` hero.

### `hail.platform_test.001`

| Phase | Contract (transporter) | Paintbox / Android |
| --- | --- | --- |
| Entrance | scan_resolve + vertical_phase + scanfall | Paint Box-local beam_in → materialize |
| Stable | readable hold | Procedural `slot_shield_chevron` from `glyph_render` |
| Exit | dematerialize | beam_out choreography |

Rebuilt on each `upsert-platform-test-hail.py` run — message includes UTC timestamp.

### `hail.star_trek_composed.001`

| Phase | Contract (transporter) | Paintbox / Android |
| --- | --- | --- |
| Entrance | scan_resolve + vertical_phase + scanfall | Paint Box-local beam_in → materialize |
| Stable | readable hold | Composed glyph from `glyph_render`; glyph-local pulse |
| Exit | dematerialize | beam_out choreography |
| Size tier | `size_tier` + `size_code` in render-payload | Honors tier on POST |

**Glyph note:** Procedural `compose_ring_flame` — field + charge; not a legacy medallion.

### `hail.spoon_transporter.001`

Transporter with **spoon** effect variation. Medium tier; procedural `slot_lozenge_bolt` hero via `custom-spoon-transporter`.

---

## Renderer readiness metadata

`config/lcard/hail-renderer-readiness.json` tracks Google TV overlay APK readiness.

| Hail | Rooms | Primary renderer | Notes |
| --- | --- | --- | --- |
| `hail.away_team.001` | away_team | `hail_overlay` | Active; `custom-away-team` + `glyph_render` |
| `hail.platform_test.001` | arcade, away_team | `hail_overlay` | Active; `custom-platform-test` + `glyph_render` |
| `hail.star_trek_composed.001` | arcade, master_bedroom | `hail_overlay` | Active; `custom-star-trek` + `glyph_render` |
| `hail.spoon_transporter.001` | operator-defined | `hail_overlay` | Active; `custom-spoon-transporter` + `glyph_render` |

---

## Recommendations summary

| Hail | Glyph | Effect / animation | Overall |
| --- | --- | --- | --- |
| `hail.away_team.001` | keep (`custom-away-team`) | keep transporter + spoon | keep |
| `hail.platform_test.001` | keep (`custom-platform-test`) | keep transporter | keep |
| `hail.star_trek_composed.001` | keep (`compose_ring_flame`) | keep transporter | keep |
| `hail.spoon_transporter.001` | keep (`custom-spoon-transporter`) | keep transporter + spoon variation | keep |

**Catalog hygiene:** Platform test is the canonical smoke hail with a procedural hero. Legacy proof hails remain removed from operator-facing surfaces.

---

## Cross-reference: glyph pipeline proof

`hail.platform_test.001` + `custom-platform-test` and `hail.star_trek_composed.001` + `custom-star-trek` demonstrate end-to-end **composed procedural glyph** delivery (programmatic or Forge → effective `glyph_render` → LCARD → Android).

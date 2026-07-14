# Hail glyph inventory v001

**Ownership:** Axiom owns Hail definitions and glyph references. LCARD and Android consume `glyph_id` and `glyph_render` from Axiom effective/render payloads.

**Companion:** Hail object/animation inventory — `object-inventory-v001.md`, `effect-inventory-v001.md`, `animation-language-v001.md`. This document covers the **central visual mark** only.

**Date:** 2026-06-18 (upgrade-or-remove pass — `pso-20260618-axiom-glyph-hero-upgrade-or-remove`)  
**Doctrine:** `glyph-composition-direction-v001.md`, `glyph-hero-intent-v001.md`, `forge-authoring-intents-v001.md`, `hails-render-parity-v001.md`

---

## Registered glyph IDs (allowlist)

| Glyph ID | Status | Quality | Recommendation |
| --- | --- | --- | --- |
| `default` | legacy registry | delivery-only | **remove from compose** — system fallback for unknown ids only |
| `hail-summons`, `hail-alert`, `hail-route`, `hail-beacon` | **deprecated** | legacy | **remove** from operator surfaces — delivery/render only for old APK assets |
| `custom-*` (procedural) | operator | varies | **keep** — primary fleet path via Forge + `glyph_render` |
| `custom-away-team` | platform smoke | **usable** | **keep** — Away Team device proof (`hail.away_team.001`) |
| `custom-platform-test` | platform smoke | **usable** | **keep** — programmatic hero for `hail.platform_test.001` |

Sources: `backend/hails_domain.py` (`KNOWN_GLYPH_IDS`), `config/hails/hail-render-contract.v001.json`, LCARD/Android allowlists (`glyph_render` path for `custom-*`).

---

## Per-Hail inventory (operator catalog)

| Hail ID | Display name | Glyph ID | Glyph source | Format | Hail status | Quality | Recommendation | Related effect | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `hail.away_team.001` | Away Team | `custom-away-team` | programmatic `slot_band_ray` | procedural SVG | **active** | **usable** | **keep** — Away Team TV device proof | `transporter` (`spoon`) | Phase E proof; `upsert-away-team-hail.py` |
| `hail.platform_test.001` | Test | `custom-platform-test` | programmatic `slot_lozenge_bolt` | procedural SVG | **active** | **usable** | **keep** — living platform smoke; upsert regen full package | `transporter` | Not operator-authored; rebuilt by `upsert-platform-test-hail.py` |
| `hail.spoon_transporter.001` | Spoon transporter test | `custom-spoon-transporter` | programmatic `slot_lozenge_bolt` | procedural SVG | **active** | **usable** | **keep** — transporter spoon variation + hero glyph | `transporter` (`spoon`) | Upgraded per `pso-20260618-axiom-glyph-hero-upgrade-or-remove` |
| `hail.star_trek_composed.001` | Star Trek | `custom-star-trek` | Forge `compose_ring_flame` → `glyph_render` | procedural SVG | **active** | **usable** | **keep** — composed emblem TV proof | `transporter` | Routes arcade + master_bedroom |

**Removed from active catalog (do not restore as exemplars):** retired sniffer / can-i-see-this proof hails per `pso-20260616-axiom-glyph-composition-h3`.

---

## Custom glyph library (Forge)

| Glyph ID | Label | Family (`generator_id`) | Parts | Status | Notes |
| --- | --- | --- | --- | --- | --- |
| `custom-star-trek` | Star Trek | `compose_ring_flame` | ring field + flame charge | **active** | Referenced by `hail.star_trek_composed.001`; LCARD forwards `glyph_render` |
| `custom-away-team` | Away Team | `slot_band_ray` | band field + ray charge | **active** | Device proof hail; `upsert-away-team-hail.py` |
| `custom-platform-test` | Test | `slot_lozenge_bolt` | lozenge field + bolt charge | **active** | Platform smoke; `hails_platform_test.py` |
| `custom-spoon-transporter` | Spoon | `slot_lozenge_bolt` | lozenge field + bolt charge | **active** | Spoon transporter proof hail; `upsert-spoon-transporter-hail.py` |

New Forge seeds use **H3.5 slot composer** grammars only (`slot_{field}_{charge}`). Saved `compose_*` families remain for explicit variation regen. See `forge-authoring-intents-v001.md` and `glyph-family-variation-v001.md`.

---

## Asset locations by surface

| Surface | Path | Glyph rendering |
| --- | --- | --- |
| Axiom Forge / Paintbox | `HailConsumerGlyph`, `hailGlyphDisplay.tsx` | `glyph_render` for custom; registry medallions for allowlist |
| Axiom Hails management | `HailsView.tsx` | allowlist + custom library |
| LCARD effective | `enrich_hail_for_lcard_effective()` | `glyph_render` on hail projection |
| Android Hail overlay | `GlyphDisplay.kt` | procedural `glyph_render` + legacy `glyph_*.xml` |

**Render parity:** Paintbox preview and Google TV overlay share the same `glyph_render` payload (`hails-render-parity-v001.md`).

---

## Historical / deprecated patterns

| Pattern | Status | Notes |
| --- | --- | --- |
| `default` as quality exemplar | **retired** | Upgrade hails to `custom-*` or remove from catalog |
| `icon.kind: emoji` | **deprecated** | Pre-v002; migrated to glyph |
| H2 `hero_*` new seeds | **prohibited** | Saved glyphs only; new seeds use **H3.5 `slot_*`** |
| H3 `compose_*` new seeds | **prohibited** | Saved glyphs / explicit variation regen only |
| `primitive_compose` new seeds | **deprecated** | H3 composed emblem required |
| Emoji in production overlay | **fallback only** | Degraded paths only |
| Legacy hail migration | **forbidden** | **Upgrade or remove** per `pso-20260618-axiom-glyph-hero-upgrade-or-remove` |

---

## Quality summary

| Quality rating | Count (active operator-facing) |
| --- | --- |
| usable | 4 canonical hails + operator hails with `custom-*`; 4 programmatic hero glyphs |
| upgrade pending | 0 |
| strong | pending operator review at Large Paintbox / Arcade after TV tuning pass |

**Batch upsert:** `python3 scripts/upgrade-canonical-glyph-heroes.py`

**Verifier:** `npm run verify:hails-glyph-hero-quality-v001` — enriched package hero gate + fleet audit pytest.

**Beta cut (2026-06-17):** Glyph Color loadout tints marks via palette roles (`hails-render-parity-v002.md`); registry built-ins deprecated for compose — `custom-*` only.

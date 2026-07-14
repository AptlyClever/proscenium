# Hail named effect inventory v001

**Ownership:** Axiom owns named effects, lifecycle timing, Paint Box canon, and effect identity in `config/hails/hail-render-contract.v001.json`. LCARD preview and Android overlay consume `effect_id` from Axiom render payloads.

**Companion:** `object-inventory-v001.md`, `animation-language-v001.md`, `effect-registry-v001.md`, `catalog-render-contract-hygiene-v001.md`, `size-tier-semantics-v001.md`, `glyph-inventory-v001.md`.

**Date:** 2026-06-15 (refreshed post Effect Registry #137 and **Transporter Phase G** G1–G4)  
**Branch:** `main` (merged #138–#141)  
**Issue:** AptlyClever/ctrl-alt-axiom#137 (campaign), #77 (parent inventory PWI)

**Downstream context:** LCARD #178 (Paint Box transporter rebuild), #180 (size-tier support), Axiom #84/#88 (catalog hygiene). Effect Registry campaign (#137) delivered registry, browse honest preview, tuning UX, and consumer payload projection. Runtime device validation still deferred (`control-alt-lcard#181`).

---

## Runtime effect allowlist

| Effect ID | Legacy alias | Status | Default? |
| --- | --- | --- | --- |
| `none` | — | canonical | no |
| `pop` | `subtle_ping` (workbench preset) | canonical | no |
| `burst` | `transporter_dense`, `high_attention` | canonical | no |
| `transporter` | `transporter_beam` | canonical | **yes** |
| `scan` | — | **planned** (`effectRegistry` entry, status `planned`) | no |

Sources: `previewVisual.effectRegistry`, `effects.allowlist`, `backend/hails_render_contract.py` (`active_effect_ids()`, `effect_registry_entries()`), `backend/hails_domain.py`.

---

## Per-effect inventory

| Effect ID | Label | Impact floor | Glyph resolve | Field | Particles | Message reveal | Entrance ms | Exit ms | Stable residual | Quality | Recommendation | Production surfaces |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `none` | None | 0 | fade | none | none | fade | 250 | 200 | none | **usable** | **keep** — quiet functional baseline; validate TV legibility when Android multi-effect lands | Contract + preview only |
| `pop` | Pop | 0.72 | overshoot_pop | micro_flash | tiny_sparks | quick_follow | 400 | 300 | none | **weak** | **refactor** (harness) — Phase D TV-safe default tuning applied; not scheduled for Android | Contract + Axiom browse preview |
| `burst` | Burst | 0.78 | center_snap | radial_bloom | radial_burst | post_impact_fade | 780 | 560 | optional_glyph_local | **weak** | **refactor** (harness) — Phase D TV-safe default tuning applied; not scheduled for Android | Contract + Axiom browse preview |
| `transporter` | Transporter | 0.85 | scan_resolve | vertical_phase | scanfall | secondary_scan_fade | 1900 | 1400 | glyph shimmer (stable) | **usable** (device) | **keep** — sole Android production effect; entrance/exit VFX + stable beam suppress matches authoring Simulation; Away Team 1080p proof 2026-06-18 (step 7) | Web-preview + **Android (`transporter_beam`)** |

### Quality notes

| Rating | Meaning applied here |
| --- | --- |
| `good` | Keep with minor polish only |
| `usable` | Acceptable for current scope |
| `weak` | Does not meet Hail visual standard (harness-only effects) |
| `bad` | Rebuild or remove |
| `unknown` | Not enough runtime evidence |

**Transporter (current posture):** LCARD web-preview and Axiom authoring Simulation share phased lifecycle: **entrance/exit** draw full transporter VFX; **stable** suppresses transport beam (glyph residual shimmer only). Android overlay implements the same policy (`TransporterLifecycle.computeStableFrame` → `beamActive = false`; entrance draws via `drawTransporterFrame`).

**Device proof (2026-06-18, work chain step 7 — COMPLETE):** Away Team Google TV @ 1080p (`away_team`, Tailscale `100.87.93.94`). Overlay APK **`2.0.0-alpha.24`**. Operator confirmed: entrance/exit transporter VFX visible; stable phase beam suppressed (by design); Message Sidekick on Axiom send (`hail.away_team.001`, Spoon variation). **Renderer fix:** Compose `Animatable` did not invalidate effects on overlay windows — replaced with 16ms `mutableFloatStateOf` frame loop (`TransporterOverlay.kt`). **Layer stack:** scrim → effects (`drawBehind`, package-local coords) → glyph → message (`imprint-hail-package-sidekick-transition-boundary`). **Message:** fit-to-band typography (`MessageTypography.kt`). Choreography timing vs Simulation: minor skew — polish only.

**Historical (pre–LCARD #178):** Android used a full-screen centered beam with infinite shimmer — superseded in code.

---

## Lifecycle timing (additive model)

`visual.duration_ms` on hail records maps to **`stable_hold_ms` only**. Entrance and exit ms come from the named effect definition.

| Effect | Stable hold example (5s hail) | Total timed lifecycle |
| --- | --- | --- |
| `none` | 5000 | 5450 ms |
| `pop` | 5000 | 5700 ms |
| `burst` | 5000 | 6340 ms |
| `transporter` | 5000 | 8300 ms |

Formula: `entrance_animation_ms + stable_hold_ms + exit_animation_ms`.

Modes: **timed** (auto exit after hold) vs **hold** (stable until Hide).

---

## Effect identity projection

`build_consumer_render_payload()` emits:

| Field | Consumer | Notes |
| --- | --- | --- |
| `effect_identity` | LCARD preview + overlay POST | Glyph resolve, field, particle, message styles (merged per variation) |
| `effect_variation_id` | LCARD adapter + overlay POST | Voyaging / generation-next / spoon (transporter) |
| `effect_variation` | LCARD `_axiom` metadata | Label, recommended_palette_id, preview profile |
| `effect_tuning` | LCARD / diagnostics | Normalized operator snapshot (Phase D) |
| `effect_tuning_projection` | LCARD workbench bridge | Registry `mapsTo` → workbench keys |
| `android_effect_tuning` | LCARD overlay POST | Transporter subset: `beam_intensity`, `beam_scale` |
| `capability_summary` | UI / diagnostics | Honesty metadata from registry |

**Android today:** overlay POST carries `effect_variation_id`, `effect_identity`, and `android_effect_tuning` (Phase G3). Kotlin renderer does not yet branch on variation — **#181** when operator approves device proof.

---

## Operator tuning (effectRegistry)

Each active registry entry defines `tuning.variables` and `tuning.defaults`. Operators persist `visual.effect_tuning` via Hails loadout **Customize effect** (Phase C). Effect chip selection resets tuning to registry defaults.

| Effect | Illustrative variables | Android consumable |
| --- | --- | --- |
| `none` | fade_speed, message_backing_emphasis | none |
| `pop` | pop_size, pop_impact, spark_density | none |
| `burst` | bloom_strength, snap_intensity, particle_spread | none |
| `transporter` | beam_intensity, beam_shape, beam_scale, beam_color_emphasis | beam_intensity, beam_scale only |

Phase D refined default tuning for `pop` and `burst` (lower intensity defaults). Gallery presets carry starter `effect_tuning` snapshots.

---

## Workbench-only artifacts (internal projection)

Contract blocks for tuning only: `effectPresets`, `presetPresence`, `animationProfiles`, `scaleGrammar`, `previewTiming`, `workbench_tuning`. End-user/runtime selection remains **size tier + `effect_id`**.

LCARD `named-effects.js` bridges named effects → legacy preset IDs for canvas hydration.

---

## Empirical usage (hail records)

| Effect ID | Hails using it (operator catalog) |
| --- | --- |
| `transporter` | `hail.spoon_transporter.001`, `hail.star_trek_composed.001` (100%) |
| `pop` | none |
| `burst` | none |
| `none` | none |

No hail record exercises non-transporter effects in production data.

---

## Schema / contract gaps

| Gap | Impact | Follow-up |
| --- | --- | --- |
| LCARD overlay adapter rejects `pop`/`burst`/`none` | 3 of 4 effects undeliverable to device | By design — extend only when Android multi-effect explicitly scheduled |
| Android `allowedEffectIds = transporter_beam` only | Single-effect appliance | **Current production scope** per #88 |
| LCARD overlay variation projection (G3) | POST carries variation + identity; Kotlin renderer TBD | Android renderer when **#181** approved |
| Android ignores `effect_id` for renderer selection | Always `TransporterOverlay` | Expected until multi-effect renderer |
| `size_tier` device proof | Static/unit only downstream | `control-alt-lcard#181` |
| No JSON Schema for hail `visual` block | Validation in Python only | Promote with standards bundle |
| `scan` registry entry `status: planned` | Not previewable in browse proof | Implement adapter when scheduled |

---

## Quality summary

| Quality | Effects |
| --- | --- |
| good | 0 |
| usable | 2 (`none` harness; `transporter` Android + Away Team proof) |
| weak | 2 (`pop`, `burst` — harness only) |
| bad | 0 |
| unknown | 0 |

---

## Campaign evidence (#137, 2026-06-15)

| Phase | PR | Headline |
| --- | --- | --- |
| A — Registry foundation | #138 | `effectRegistry` contract, validation, API |
| B — Honest browse preview | #139 | Enable/Disable Effects, registry-honest paintbox |
| C — Tuning UX | #140 | Customize panel, `effect_tuning` persistence |
| D — Consumer projection | #141 | Render-payload tuning + capability summary |
| E — Evidence | (this pass) | Inventory refresh, acceptance checklist, report |

**Evidence class:** static (contract, unit tests, verifiers, docs). **Not performed:** deploy, arcade runtime, device visual proof (#181).

---

## Phase G evidence (transporter fidelity, 2026-06-15)

| Step | Evidence |
| --- | --- |
| G1 — Axiom authoring canvas | `hailTransporterCanvasPreview.ts`, `verify-hails-transporter-canvas-preview-g-v001.mjs` |
| G2 — Parity captures | `parity-g2.html`, `reports/hails-transporter-parity-g2-v001.md`, composite PNG |
| G3 — LCARD adapter | `control-alt-lcard:axiom-hail-variation-bridge.js`, `verify-hails-lcard-variation-adapter-g3-v001.mjs` |
| G4 — Campaign exit | `reports/hails-transporter-phase-g-evidence-g4-v001.md`, this section |

**Phase G status:** `complete` (static). **Phase E / #181 / step 7:** Away Team device proof recorded 2026-06-18; message typography parity fix in overlay APK.

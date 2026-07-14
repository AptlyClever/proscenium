# Hail animation language v001 (draft)

**Status:** Draft operational standard — inventory companion for issue #77.  
**Superseded for message timing (2026-06-21):** Message reveal during effect entrance → **`pso-20260621-axiom-message-sidekick-registry`** (stable-phase Message Sidekick).
**Tone:** Operational notification on a TV surface, not cinematic magic.  
**Owner:** Axiom (contract + payload semantics). Renderers are consumers.

**Related:** `config/hails/hail-render-contract.v001.json`, `effect-inventory-v001.md`, `object-inventory-v001.md`, `size-tier-semantics-v001.md`.

**Refreshed:** 2026-06-13 post #88 — aligns with LCARD #178/#180 merged code; runtime device proof deferred (#181).

---

## Purpose

Define how a Hail **moves, appears, holds, and exits** so operators get consistent, readable, TV-safe feedback. Glyphs answer *what* the Hail is; animation answers *how it arrives and departs*.

---

## Lifecycle phases

Every named effect implements the same phase model:

```text
hidden → entrance → stable (hold) → exit → cleared
```

| Phase | Operator goal | Constraints |
| --- | --- | --- |
| **Entrance** | Signal that something is arriving; build to readable glyph | Glyph resolves before stable hold; message stays hidden until stable phase |
| **Materialization** | Glyph becomes identifiable | Glyph resolve style per effect (`fade`, `overshoot_pop`, `center_snap`, `scan_resolve`) |
| **Stable hold** | Operator and viewer read glyph + message | Duration = hail `visual.duration_ms`; minimum readable time **≥ 3000ms** for TV |
| **Exit** | Clear without leaving ghost UI | Symmetric or shorter than entrance; must release overlay resources |
| **Cleared** | No persistent chrome | Appliance returns to prior activity (Android HOME trampoline policy preserved) |

**Timed mode:** entrance → stable_hold_ms → exit → clear.  
**Hold mode:** entrance → stable until explicit Hide → exit → clear.

---

## Duration ranges (v001 canon)

| Parameter | Source | Typical range | Notes |
| --- | --- | --- | --- |
| `stable_hold_ms` | Hail record `visual.duration_ms` | 3000–8000 ms | Operator-configured readable phase |
| `entrance_animation_ms` | Named effect contract | 250–1900 ms | Additive — not included in “5s hail” |
| `exit_animation_ms` | Named effect contract | 200–1400 ms | Additive |

**Rule:** When an operator says “5 second hail,” they mean **5 seconds of stable readable content**, not total wall-clock including animations.

---

## Motion constraints

1. **Paint Box bound** — All effect envelopes render inside Safe Effect Zone; no viewport-filling glow storms (`effectsBudget.hardNo`).
2. **Glyph-first hierarchy** — Layout order: Paint Box → Safe Effect Zone → Glyph Focus Region → Effect Envelope → Glyph Resolve → Message Support.
3. **Placement-aware** — Preset placement anchors the Paint Box; Android production code honors preset/custom placement (#178).
4. **Size-tier-aware** — Paint Box fractions follow `size_tier` / `size_code` (#180); glyph visual sizing uses Axiom contract formula (see `size-tier-semantics-v001.md`).
5. **Particle budget** — Max 60 particles; size-tier caps for entrance/exit/stable (`effectsBudget.bySize`).
6. **Transport beams** — Allowed only during entrance/exit phases, localized to glyph focus — not persistent full-field beams during stable hold.

**Historical:** Pre–#178 Android used infinite shimmer and full-screen beam — not current code posture.

---

## Opacity, blur, and glow

| Element | Rule |
| --- | --- |
| Glyph glow | Subtle; `glyphGlowAlpha` ≤ 0.25 effective; must not obscure glyph silhouette |
| Message backing | Semi-opaque plate; readable at 10-foot distance |
| Field effects | `micro_flash`, `radial_bloom`, `vertical_phase` stay inside effect envelope |
| Reduced motion | Hail record `reduced_motion_fallback: static_toast` — future consumer path; document now |

---

## Screen placement and TV-safe behavior

- Presets use edge insets from contract `placement.edgeInsets` — not raw pixel offsets in payloads.
- Custom placement: `x_percent` / `y_percent` within 5–95% clamp.
- **TV-safe:** No rapid strobing > 3 Hz; no full-screen white flash; message + glyph must remain legible on 1080p at 10 feet.
- **Same-area test hails** (`arcade → arcade`) use same rules — placement is destination-relative on overlay device.

---

## Named effect personalities (operational)

| ID | Operator intent | Motion language |
| --- | --- | --- |
| `none` | Acknowledgment, low attention | Fade in/out; no particles |
| `pop` | Quick playful ping | Short overshoot + micro flash; < 1s total animation overhead |
| `burst` | Confident alert | Radial bloom + snap; moderate duration |
| `transporter` | Deliberate sci-fi assemble | Scanfall + vertical phase; slowest entrance; default for canonical hails |

Default remains `transporter` on Android production. `pop`, `burst`, and `none` are contract + preview-harness concepts until explicitly implemented on device.

---

## Accessibility and readability

- Plain-text message only (max 120 chars).
- Message reveal follows glyph lock-in (`choreographyAnchors.glyphLockIn` → `messageRevealStart`).
- Do not rely on color alone — glyph shape carries identity (`default` proof).
- Audio block exists on hail records but is **future** — animation must stand alone visually.

---

## Consumer obligations (summary)

| Consumer | Must | Must not |
| --- | --- | --- |
| Axiom | Own contract, project lifecycle_timing + effect_identity + size_tier | Delegate effect canon to LCARD |
| LCARD preview | Implement full named effect set for tuning | Publish workbench knobs as runtime payload fields |
| LCARD delivery | Broker authorized payloads; bind `size_tier` in proof | Author Hail definitions; reintroduce TvOverlay |
| Android overlay | Honor `transporter_beam`, placement, Paint Box, `size_tier` | Implement pop/burst/none without explicit slice |

---

## Follow-up priority (from inventory — post #178/#180)

1. **Runtime validation** — Android transporter + size tiers on approved TV target (#181; operator approval required).
2. **Extend** LCARD overlay adapter beyond `transporter_beam` only when Android multi-effect renderer is explicitly scheduled.
3. **Refactor** `pop` and `burst` in harness against TV-safe budgets before any production promotion.
4. **Expose** `visual` editing in Axiom Hails UI (separate UX slice).

---

## Versioning

- Document: `animation-language-v001`
- Contract: `v001-integration`
- Bump together when entrance/exit canon or budget rules change materially.

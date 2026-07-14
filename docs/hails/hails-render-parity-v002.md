# Hail render parity v002

**Status:** Active — graduated at **Hails Collective Beta 2.0** (`hails-2.0-beta`, 2026-06-17). Supersedes the v001 doc for new work; v001 remains historical.
**Collective authority:** `docs/hails/hails-collective-beta-v002.md`
**Authority:** `docs/hails/hails-authority-v001.md`  
**Glyph doctrine:** `docs/hails/glyph-composition-direction-v001.md`

---

## 1. Rule (tiered glyph delivery)

**One hero identity, explicit consumer projections** — canonical authoring graph vs TV overlay delivery (`glyph_render` / `glyph_render_canonical` on consumer payload).

- Single consumer path: `build_consumer_render_payload()` → `derive-preview` / `render-payload` → LCARD adapter → overlay APK.
- **No parallel preview-only** glyph or effect renderers for authoring surfaces.
- **No masking** consumer fields in derive-preview (e.g. replacing `custom-*` with `default`).
- **No silent drift:** Forge / Hails Paintbox default to **canonical** glyph view; **TV delivery** toggle shows projected `glyph_render` (matches overlay POST).

**Render target:** `render_target.surface = google_tv`, rooms `arcade`, `master_bedroom`, `away_team`.

---

## 2. Layer boundaries (scoped changes)

Hail display splits into **independent layers**. Editing one layer must not accidentally change another.

| Layer | Owns | Consumer fields | Preview module |
| --- | --- | --- | --- |
| **Shell** | Paint Box chrome, placement anchor, size tier, safe zone | `placement_*`, `size_tier`, `size_code` | `HailPaintboxPreview` stage chrome |
| **Effect** | Choreography, beam, particles, message reveal timing | `effect_id`, `effect_variation_id`, `effect_tuning`, `android_effect_tuning`, `effect_identity`, `lifecycle_timing` | `hailRegistryPreviewRenderer`, `HailTransporterCanvasLayer` |
| **Glyph** | Identity mark inside Glyph Focus | `glyph_id`, **`glyph_render`** (TV), **`glyph_render_canonical`** (when different) | `HailConsumerGlyph` from payload; **Canonical / TV delivery** toggle |

**Rule:** Effect work touches effect modules and effect payload fields only. Glyph work touches `glyph_render` and glyph display only. Shell work touches placement/size chrome only.

---

## 3. Consumer payload extensions

### `glyph_render`

Projected by `backend/hails_glyph_render.py` on every consumer payload:

| `kind` | TV behavior |
| --- | --- |
| `registry` | APK bundled drawable for `glyph_id` |
| `procedural` | APK renders `procedural_graph` paths (custom glyphs) |
| `emoji_fallback` | APK shows fallback — **not parity**; warn operator |

Custom glyphs **must** include a valid `procedural_graph` in `glyph_render` for Google TV delivery. When canonical and TV graphs differ, payload also carries `glyph_render_canonical` for authoring honesty.

| Field | Consumer | Role |
| --- | --- | --- |
| `glyph_render` | `google_tv_apk` | Projected graph — **overlay POST** |
| `glyph_render_canonical` | `axiom_authoring` | Full hero graph when projection trims ink |

### `render_target`

```json
{
  "surface": "google_tv",
  "contract": "google_tv_v1",
  "rooms": ["arcade", "master_bedroom"]
}
```

---

## 4. Effect parity (Google TV v1)

Google TV overlay **delivers transporter only** (`android: partial` on transporter; `none` on pop/burst/none).

| Authoring surface | Behavior |
| --- | --- |
| `registryHonestPreview` + `googleTvParity` (default on Forge / Hails edit) | If effect is not Android-deliverable, **suppress effect motion** — show glyph + message as TV would |
| Operator enables “Effects” toggle | Still capped by TV deliverability when `googleTvParity` is on |
| Transporter | Registry-honest canvas path aligned to LCARD `renderer.js` / APK |

---

## 5. Surfaces (must use consumer path)

| Surface | Requirement |
| --- | --- |
| Hail Forge (glyph + effect) | `HailRegistryAuthoringPreviewStack`, `googleTvParity` |
| Hails Studio edit / New Hail | Same |
| Hails browse proof / profile | `registryHonestPreview`, consumer `glyph_render` |
| Composer dialog (legacy) | Migrate to registry-honest + TV parity when touched |

**Retired for authoring:** CSS-only `hailPaintboxPreviewEffects` presets as primary preview (browse/profile must not diverge).

### 5.1 Hails Studio Paintbox — composed hail consumer

**Intent:** Show the **entire composed hail** (glyph + message + effect/loadout + Paint Box shell) as Google TV would consume it — not a preview-only renderer.

**Consumption contract:**

```text
draft editor state
  → POST derive-preview { record, custom_glyphs? }
  → build_consumer_render_payload(..., custom_glyphs=...)
  → render_payload (render_target.surface = google_tv)
  → HailPaintboxPreview renders layers from payload only
```

| Input (upstream of consumption) | Persisted on Save? | Role |
| --- | --- | --- |
| Glyph strip selection | Yes | Sets `icon.value`; custom specs in `custom_glyphs` overlay |
| Message / name | Yes | `message.short_text` in derive-preview record |
| Loadout (effect, palette, size) | Yes | `visual.*` in derive-preview record |
| Routes / delivery (backstage) | Yes | Does not change Paint Box appearance |
| **`custom_glyphs` overlay** | Forge draft / unsaved glyph edits only | Merged **into** consumer projection — not a parallel glyph draw path |
| **Effects On / Off toggle** | **No** — preview view mode only | Suppresses effect-layer motion; glyph + message unchanged; still reads same payload |

**View modes vs composition:** Loadout chips and glyph selection change the **draft hail** fed to derive-preview. The Effects toggle changes **which layers animate** in Paintbox (glyph focus vs full choreography) without PATCHing the hail. When `googleTvParity` is on, effect motion remains capped by TV deliverability even when Effects are on.

**Glyph delivery view (custom glyphs):** **Canonical** (default) renders `glyph_render_canonical` when present; **TV delivery** renders projected `glyph_render` — same ink as overlay POST. Toggle is a non-persisted view mode; not a second renderer.

**Shell (authoring chrome only):** Loadout column, Effects toggle, optional compose shell frame — see **`paintbox-authoring-chrome-v001.md`**. Forge/Hails edit use **bare** chrome by default (no dashed effect-zone box). Placement anchor + size tier live on `[data-hail-paintbox-anchor]`.

**Failure mode:** If `glyph_render` is missing for a `custom-*` glyph, Paintbox must **not** fall back to registry `default` (+). Show loading or an explicit unresolved state until derive-preview returns a valid payload.

### 5.2 Hail Forge — authoring intents (Create)

**Authority:** `forge-authoring-intents-v001.md` · Praxis `pso-20260617-axiom-forge-authoring-intents`

Forge uses the **same consumer payload** as §5.1 but **`authoringIntent`** changes preview chrome and defaults — not projection:

| Intent | Workspace | Hero | Effects default | Glyph |
| --- | --- | --- | --- | --- |
| `glyph` | Forge → Glyphs | `glyph_render` artwork (large) | **Off** on New Glyph | Always shown |
| `effect` | Forge → Effects | Effect phase loop | **On** | Reference; **hide toggle** |
| `compose` | Hails edit | Full hail | Operator choice | Selected asset |

Layer toggles are **view filters** on payload layers. **Glyph focus / TV size** in Forge scale the mark **inside the same 18×16rem paintbox** — they do not change viewport size or switch to `compose` intent.

**Paintbox chrome:** `paintbox-authoring-chrome-v001.md` — shared fixed frame; compose uses `placement_id` anchor; Forge glyph/effect use centered anchor.

---

## 6. Superseded (do not reintroduce)

| Pattern | Why |
| --- | --- |
| `custom-*` → `default` in derive-preview body | Hides real glyph from consumer projection |
| Procedural SVG preview without `glyph_render` in payload | Parallel glyph path |
| Client re-projecting `customGlyph` after derive-preview | Bypasses consumer; use `custom_glyphs` overlay as derive-preview **input** instead |
| `custom-*` → registry `default` medallion when payload pending | Hides missing `glyph_render`; use loading/unresolved state |
| “Axiom-preview-first” for fleet hails | Violates parity rule |
| Effect animations for undeliverable effects when `googleTvParity` | TV would not show them |
| Changing glyph when editing effect-only UI | Layer boundary violation |

---

## 7. Per-consumer glyph projections (shipped)

Tiered glyph delivery is **explicit** — one hero identity, multiple consumer projections (`tv-glyph-parity-tiered-delivery-v001.md`).

| Surface | Default glyph view | TV delivery toggle |
| --- | --- | --- |
| Forge (glyph / compose) | Canonical (`glyph_render_canonical`) | Projected `glyph_render` |
| Hails Studio edit | Canonical | Projected |
| LCARD overlay POST | — | `glyph_render` only |
| HTML / catalog chips | Canonical | N/A |

Overrides are **never silent** — operators switch views in Paintbox; parity doc and payload fields document the split.

**Future:** Additional `render_target` variants (tablet, low_power) with capability matrices.

---

## 8. Implementation map

| Component | Role |
| --- | --- |
| `backend/hails_glyph_render.py` | `glyph_render` projection |
| `backend/hails_render_contract.py` | `build_consumer_render_payload` |
| `frontend/src/hailConsumerRender.ts` | TV deliverability helpers |
| `frontend/src/hailConsumerGlyph.tsx` | Glyph layer from `glyph_render` |
| `frontend/src/hailAuthoritativeGlyphRender.ts` | Canonical vs TV glyph resolution + honesty labels |
| `frontend/src/hailAuthoringPreviewChipSet.ts` | Canonical / TV delivery chip catalog |
| `frontend/src/components/HailPaintboxPreview.tsx` | Consumer-driven glyph + TV effect cap |
| `control-alt-lcard/.../hail-overlay-glyph-allowlist.js` | Allow `custom-*` when `glyph_render` procedural |
| `hail-overlay-poc/.../GlyphDisplay.kt` | Registry + procedural paths |

---

## Beta cut addendum

- Glyph Color loadout tints procedural/registry marks via palette roles (separate from effect variation palette)
- `data-hail-glyph-palette` / `data-hail-paintbox-palette` split on paintbox stage

## See also

- `paintbox-authoring-chrome-v001.md` — locked authoring viewport frame

- `docs/hails/consumer-surface-matrix-v001.md`
- `docs/hails/effects-enhancement-v001.md`
- `.cursor/rules/hails-render-parity.mdc`

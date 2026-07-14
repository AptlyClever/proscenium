# TV glyph parity + tiered delivery v001

**Status:** Design authority (operator + implementer).  
**Campaign:** `pso-20260619-axiom-tv-glyph-parity-tiered-delivery-campaign`  
**Related:** `hails-render-parity-v002.md`, `glyph-hero-intent-v001.md`, `consumer-capability-manifest.v002.json`

---

## 1. Problem

Hero Glyph authoring will exceed Google TV overlay procedural capabilities (fill, circles, layered depth, palette-tinted ink, higher path budgets). Today:

- Axiom projects **one** `glyph_render` graph for all consumers (`hails_glyph_render.py`).
- Paintbox parity doctrine expects that same graph on TV (H4a).
- The APK renderer implements **stroke-only paths, no circles, white ink** — a subset chosen in code, not a platform limit.

Operators need to **design rich heroes** while TV receives a **deliberate, legible primitive** — without silent drift between Forge and the living room.

---

## 2. Boundary map (discovery 2026-06-19)

### Platform-hard (cannot code away)

| Limit | Impact |
| --- | --- |
| `SYSTEM_ALERT_WINDOW` via manual appops | Ops grant per TV; no overlay settings UI on Android TV |
| `TYPE_APPLICATION_OVERLAY` | Full-screen non-touchable layer; hidden on some secure/DRM surfaces |
| 1080p @ 320 dpi | Glyph visual ~129–257 px by tier; hairlines below ~2.0 grid stroke risk illegibility at `small` |
| Overlay permission deprecation trend | Long-term platform risk |

### APK-imposed (liftable)

| Gap | TV registry drawables prove otherwise? |
| --- | --- |
| Procedural stroke-only | Yes — XML uses fill + strokeAlpha |
| `circles[]` ignored | N/A — could convert to path circles |
| No palette on glyph ink | N/A — Compose supports tint |
| No stroke caps from payload | Yes — XML uses `strokeLineCap="round"` |
| PathParser per-frame (perf) | Soft — cache paths in Phase B |

### Doctrine / contract (amendable)

| Rule today | Target |
| --- | --- |
| Single `glyph_render` everywhere | **Canonical graph in spec** + **projected graph per consumer** |
| H4a WYSIWYG same ink | H4a becomes **TV delivery view** ≡ overlay; canonical view ≡ Forge default |

---

## 3. Tiered delivery model

### Single hero identity, multiple projections

```text
custom_glyph_spec
  procedural_graph          ← canonical (authoring SoT)
  optional tv_override      ← manual TV variant (fallback)
       │
       ▼
project_glyph_render(consumer_id)
       │
       ├─ axiom_authoring / html_preview → canonical graph
       └─ google_tv_apk → tv_projection(canonical) → simplified graph
```

### TV projection rules (initial)

| Canonical feature | TV projection |
| --- | --- |
| `circles[]` | Convert to small closed path strokes or drop if redundant |
| `fill` | Keep if APK uplift shipped; else outline / drop |
| Shadow duplicate path | Keep (opacity + offset) — TV-safe depth |
| SVG filters | Strip — use stroke-depth layers only |
| Path count > N | Merge by role priority: mass > charge > ground > accent |
| stroke_width | Floor at TV legibility min for `size_tier` |
| Palette | Map to white + opacity on TV until tint wired |

### Payload shape (sketch)

```json
{
  "glyph_id": "custom-example",
  "glyph_render": {
    "kind": "procedural",
    "glyph_id": "custom-example",
    "google_tv_deliverable": true,
    "projection_id": "google_tv_v1",
    "source_signature": "canonical-abc123",
    "procedural_graph": { "version": 1, "paths": [] }
  },
  "glyph_render_canonical": {
    "kind": "procedural",
    "procedural_graph": { "version": 1, "paths": [], "circles": [] }
  }
}
```

Exact field names finalized in Phase C; overlay POST continues to use **`glyph_render`** (TV projection) for backward compatibility.

---

## 4. Surface matrix

| Surface | Consumer | Graph |
| --- | --- | --- |
| Forge / Paintbox default | `axiom_authoring` | Canonical |
| Forge TV delivery toggle | `google_tv_apk` | Projected |
| LCARD web-preview / HTML | `html_preview` | Canonical |
| LCARD send → overlay POST | `google_tv_apk` | Projected |
| Android APK | `google_tv_apk` | Projected (parse uplift in Phase B) |

---

## 5. Phase A probe (next)

Live Away Team POST matrix:

1. Baseline — 3 stroke paths (current fleet)
2. + fill on closed paths
3. + `circles[]`
4. + 6-layer opacity depth
5. + explicit round caps in payload (after parser uplift)

Capture: screenshot, logcat, parser acceptance.

Report: `reports/tv-glyph-parity-probe-v001.md`.

---

## 6. Non-goals

- SVG filter shadows on TV
- Overlay over DRM fullscreen video
- Replacing `TYPE_APPLICATION_OVERLAY` architecture in v001

---

## 7. References

- `backend/hails_glyph_render.py` — current single projection
- `hails-render-parity-v002.md` §7 — explicit per-device overrides (precursor)
- `control-alt-lcard/hail-overlay-poc/.../ProceduralGlyphDisplay.kt` — TV renderer
- Fleet ADB snapshot in campaign PSO Phase 0

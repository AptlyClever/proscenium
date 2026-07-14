# Presentation overlay v001 (6c framework)

**Status:** Framework — web Paintbox slot; **APK deferred** per manifest.

## Concept

Optional celebration layer on a presentation template — Lottie JSON or CSS burst profile — timed to choreography anchors.

## Contract

```json
{
  "kind": "lottie",
  "asset_ref": "spark-burst-placeholder.json",
  "anchor": "effect_field",
  "start_anchor": "glyphImpactPeak",
  "android": "deferred"
}
```

| Field | Values |
| --- | --- |
| `kind` | `lottie` \| `css_burst` |
| `asset_ref` | Relative to `config/hails/presentation-overlays/` |
| `anchor` | `effect_field` \| `glyph_focus` |
| `start_anchor` | `glyphResolveStart`, `glyphImpactPeak`, `glyphLockIn`, `messageRevealStart` |

## Paintbox

[`HailPresentationOverlay.tsx`](../../frontend/src/components/HailPresentationOverlay.tsx):

- `css_burst` — radial spark CSS (no npm dependency)
- `lottie` — loads JSON when present; safe no-op if player unavailable

## Manifest

[`consumer-capability-manifest.v002.json`](../../config/hails/consumer-capability-manifest.v002.json) → `presentation_overlay_android: deferred`.

## Defer

CSS burst and Lottie overlay remain **Paintbox-only**. APK manifest keeps `presentation_overlay_android: deferred`; no TV investment scheduled (P2-4 closed).

APK Lottie or baked sprite sheets; operator art selection is not framework scope.

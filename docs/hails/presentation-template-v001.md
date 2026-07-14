# Presentation template v001

**Pivot:** raster Glyph Hero + effects-first delivery.

## Concept

A **presentation template** is a fixed stage shell (frame/plate) with swappable hero raster and choreography profile. Templates ship as JSON under `config/hails/presentation-templates/*.template.json`.

## Fields

| Field | Role |
| --- | --- |
| `template_id` | Stable id (e.g. `stage-breakout-v1`) |
| `stage_assets` | Relative paths under `config/hails/` served at `/api/hails/presentation-assets/…` |
| `glyph_motion.profile` | Paintbox motion profile id |
| `glyph_motion.resolve_style` | Maps to registry glyph resolve (`overshoot_pop`, `center_snap`, …) |
| `choreography_anchors` | Optional override merged into effect preview plan |
| `presentation_overlay` | Optional 6c overlay slot |

## Shipped templates

| Id | Vibe |
| --- | --- |
| `stage-breakout-v1` | Card frame + hero emerge (Hearthstone-inspired, not parity) |
| `stage-medallion-v1` | Circular plate, minimal motion budget |

## Stage asset sizing

Stage PNGs render with **object-fit: contain** inside the package paint box (medium tier ≈ 653×454 px at 1920×1080 reference). Export **at least 1024 px** on the long edge (or 2× paint-box height) so TV Fit scaling stays sharp. Assets ship inline in the delivery envelope — avoid oversized sources (>2048 px) without need.

## Package binding

Set on hail record:

```json
{ "visual": { "presentation_template_id": "stage-breakout-v1" } }
```

Consumer payload exposes `presentation_template` entity from `enrich_consumer_render_payload_v2`.

## Paintbox

[`HailPresentationStage.tsx`](../../frontend/src/components/HailPresentationStage.tsx) renders stage back/front layers inside `[data-hail-package]`. Hero ink stays on `[data-hail-glyph-artwork]`.

## Verification

`npm run verify:hails-presentation-template-v001`

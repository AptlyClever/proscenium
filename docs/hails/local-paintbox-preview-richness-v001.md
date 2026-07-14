# Local Paintbox Preview Richness v001

Frontend-only enrichment of Hails Composer **Paintbox Preview** so Effect Presets feel distinct before any runtime or device involvement (issue #111).

## Goal

Authors should trust how a Hail will feel from the local preview. Each named Effect Preset gets recognizable motion/styling scoped to the preview stage.

## Effect preset preview mappings

| Preset ID | Preview feel | CSS stage class |
| --- | --- | --- |
| `transporter-sweep` | Cyan beam sweep, operational shimmer | `hail-paintbox-effect-transporter-sweep` |
| `priority-pulse` | Assertive alert pulse, urgency ring | `hail-paintbox-effect-priority-pulse` |
| `soft-ping` | Gentle pop and fade | `hail-paintbox-effect-soft-ping` |
| `scanner-pass` | Scan-line sweep over Hail card | `hail-paintbox-effect-scanner-pass` |
| `quiet-signal` | Minimal motion, calm settle | `hail-paintbox-effect-quiet-signal` |

Mapping logic lives in `frontend/src/hailPaintboxPreviewEffects.ts`. Custom (non-preset) presentations fall back from visual `effect_id` + `transition_style`.

## Reduced motion

- **Quiet Signal** preset sets `reducedMotion: true` in the effect helper.
- Preview stage exposes `data-hail-paintbox-reduced-motion="true"` when motion is minimized.
- CSS disables animations when that attribute is set or when `prefers-reduced-motion: reduce` matches.

## Preview data attributes

| Attribute | Purpose |
| --- | --- |
| `data-hail-paintbox-effect` | Active preset effect id (e.g. `transporter-sweep`) |
| `data-hail-paintbox-reduced-motion` | `"true"` when animations are suppressed |
| `data-hail-paintbox-motion-active` | Whether motion simulation is running |
| `data-hail-paintbox-motion-note` | Summary motion description |

## Verification

```bash
cd frontend && npm run build
cd frontend && npm run verify:hails-page-template
```

Includes `scripts/verify-local-paintbox-preview-richness.mjs`.

## Boundaries

- Local frontend preview only — no backend, deployment, runtime validation, or downstream integration.
- No new runtime contract fields; uses existing preset IDs and visual fields.

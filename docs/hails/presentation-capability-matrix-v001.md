# Presentation capability matrix v001

Honest Paintbox vs Google TV overlay support after raster pivot.

| Feature | Paintbox (Axiom) | APK (Google TV) | Notes |
| --- | --- | --- | --- |
| Single PNG hero (`kind: image`) | **Yes** | **Yes** | Arcade proof 2026-06-19 — alpha.30+ |
| Dual-layer hero (`kind: image_layers`) | **Yes** | **Yes** | Arcade proof 2026-06-19 — alpha.31+; accent pulse at `glyphImpactPeak` |
| Presentation template stage PNGs | **Yes** | **Yes** | Arcade proof 2026-06-19 — alpha.32; breakout frame placement signed off |
| Template choreography overrides | **Yes** | **Yes** | Transporter/breakout on TV; pop skips template anchor merge (alpha.33) |
| CSS burst overlay (6c) | **Yes** | **No** | Web-only celebration |
| Lottie overlay JSON (6c) | **Framework** | **Deferred** | Manifest `presentation_overlay_android: deferred` |
| Transporter / burst effects | **Yes** | **Yes** | Existing deliverable effects |
| Procedural SVG hero | Legacy | Legacy | Pivot deprioritizes new procedural heroes |

## Operator rule

TV rows marked **Yes** require device proof on at least one Google TV (Arcade signed off 2026-06-19). Multi-room rollout (P1-5) is deferred and does not block matrix honesty for Arcade.

## Pivot exit gate

Pivot is **stable** when offline smoke passes for both raster demos:

```bash
./scripts/smoke-raster-presentation-demos.sh
```

Live Arcade send (`--send`) is the optional operator check after deploy. See [`docs/praxis/hail-glyph-raster-presentation-tracker-px001.md`](../praxis/hail-glyph-raster-presentation-tracker-px001.md).

## Related

- [`presentation-template-v001.md`](presentation-template-v001.md)
- [`glyph-hero-layers-v001.md`](glyph-hero-layers-v001.md)
- [`presentation-overlay-v001.md`](presentation-overlay-v001.md)
- [`hails-render-parity-v002.md`](hails-render-parity-v002.md)

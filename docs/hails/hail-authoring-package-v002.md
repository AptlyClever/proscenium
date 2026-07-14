# Hail package — preview binding model v002

**Status:** Active — graduated at **Hails Collective Beta 2.0** (`hails-2.0-beta`, 2026-06-17). Supersedes the v001 doc for new work; v001 remains historical.
**Collective authority:** `docs/hails/hails-collective-beta-v002.md`
**Praxis:** `pso-20260618-axiom-forge-preview-unified-plan` · `pso-20260614-axiom-hail-authoring-surface-contract` · `pso-20260619-axiom-paintbox-parity-standards-alignment`  
**Chrome:** `paintbox-authoring-chrome-v001.md` · **HASC:** `hail-authoring-surface-contract-v001.md`

---

## Term

**Hail package** (`data-hail-package`) — the shared coordinate frame where **Effect** and **Glyph** layers compose. Size comes from the tier contract (delivery) or full hero (design) **before** layers mount. Preview chips toggle layer visibility; the package does not move.

---

## DOM contract

```text
[data-hail-paintbox-anchor]              ← placement (compose) or center (forge)
  [data-hail-paintbox-cluster]
    [data-hail-paintbox-hero]            ← position: relative; flex-1
      [data-hail-package]                ← absolute inset-0; authoritative binding box
        [data-hail-effect-layer]         ← absolute inset 0; canvas / CSS field styles
        [data-hail-glyph-layer]          ← absolute inset 0; flex center
          [data-hail-glyph-artwork]      ← relative; motion + glyph resolve animations
    [data-hail-paintbox-message]         ← outside package
```

**Do not** put `data-hail-glyph-artwork` on the same node as `data-hail-glyph-layer` — CSS layer stack requires the wrapper + inner artwork split.

Legacy aliases retained for verifiers/CSS: `data-hail-glyph-focus-region` on package; `data-hail-effect-envelope` on effect layer.

---

## Rules

1. **Package-first sizing** — never shrink-wrap to glyph SVG bounds.
2. **Layer toggles** — Effect / Glyph chips hide layers inside the package only.
3. **Transporter anchor** — beam origin at package center (`HAIL_PACKAGE_ANCHOR` 0.5, 0.5); canvas sizes to `data-hail-package`.
4. **Authoring glyph visibility** — `data-hail-authoring-package-preview` uses `scan_resolve-authoring` (clip-path only) so glyphs stay visible during transporter entrance on Forge/Hails edit.
5. **Parity** — same `visual.scale` → same package geometry on Forge TV size and Hails compose (anchor offset excepted). **Tier B** visual gate: `paintbox-parity-standards-alignment-v001.md`.

---

## Standards alignment

Compositing hygiene (`inset-0`, isolation, single beam anchor) and glyph presentation inside the package are **in scope** for `pso-20260619-axiom-paintbox-parity-standards-alignment` slices I1–I3. Do not treat package DOM alone as sufficient parity.

---

## Code

| Module | Role |
| --- | --- |
| `hailAuthoringPackage.ts` | Anchor constants + package class helpers |
| `HailPackagePreviewLayers.tsx` | Layer stack component |
| `HailTransporterCanvasLayer.tsx` | Package-scoped canvas measure + beam anchor |

---

## Verification

```bash
cd frontend && npm run build
node scripts/verify-hails-paintbox-authoring-chrome-v001.mjs
node scripts/verify-hails-forge-authoring-intents-v001.mjs
node scripts/verify-hails-registry-preview-modules-v001.mjs
```

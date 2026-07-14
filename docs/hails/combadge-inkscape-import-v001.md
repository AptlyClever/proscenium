# Combadge Inkscape import runbook v001

**Chain:** `chain-glyph-plot-proof` — external authoring at reference scale, normalize on import.

## Principle

- **Author** at reference / large artboard size in Inkscape (not 48×48 pixels).
- **Normalize** to `viewBox="0 0 48 48"` happens on import (`glyph_svg_normalize.py`).
- **Judge** at 24dp TV panel in Glyph Plot (`#/axiom/hails/plot/custom-combadge-plot`).

## Inkscape steps

1. Open `config/hails/plot-fixtures/assets/combadge-tng-reference.png` at native size.
2. **Path → Trace Bitmap** — multiple scans OK; enable smooth / stack as needed.
3. **Path → Simplify** (Ctrl+L) to reduce node count while keeping silhouette.
4. Merge to **exactly two** paths:
   - **accent** — communicator oval / bar (grille may use `fill-rule="evenodd"`).
   - **mass** — Starfleet delta.
   Use **Path → Union** / manual combine; delete clip / background paths.
5. Set object IDs or attributes:
   - `data-combadge-role="accent"` on the bar/oval path.
   - `data-combadge-role="mass"` on the delta path.
6. **File → Save As…** plain SVG (paths only; no embedded raster).

## Import (plot proof page — preferred)

1. Open `#/axiom/hails/plot/custom-combadge-plot` in Axiom.
2. Click **Import Inkscape SVG** in the P1 operator section.
3. Select your Inkscape export — judgment panels refresh automatically.
4. Judge the **24px TV thumbnail**; reply yes/no in chat.

## Import (CLI — optional)

From repo root:

```bash
python3 scripts/import-subject-svg.py char_combadge_delta_v1 --svg /path/to/export.svg
npm run verify:glyph-plot
```

Use `--no-normalize` only if paths are already authored in 48×48 grid coordinates.

## Tweak paths (optional)

Open `#/axiom/hails/plot/custom-combadge-plot/edit` only for stroke/role adjustments after import.

## If import fails

| Error | Fix in Inkscape |
| --- | --- |
| Expected exactly 2 paths | Merge extra trace paths; remove full-canvas clip rects |
| Missing required path roles | Add `data-combadge-role` on both paths |
| Outside 0–48 grid | Re-export; import normalizes scale — check for stray paths |
| Plot gate fail | Adjust silhouette read; re-import — do not hand-edit `d` in repo |

## P1 exit

Operator names **combadge** at 24dp TV thumbnail without label. Plot gate green alone is not sufficient.

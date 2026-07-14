# Glyph Hero style bases v001

**Pivot:** [`docs/praxis/hail-glyph-raster-presentation-pivot-px001.md`](../praxis/hail-glyph-raster-presentation-pivot-px001.md)

Style bases lock AI output to Control Alt fleet read. Generate against a base, pick one variant, promote PNG to `config/hails/glyph-hero-images/`.

## Bases

| Base id | Prompt anchor | Accept when |
| --- | --- | --- |
| **`ca-monolith-v1`** | Solid silhouette, 1–2 tone, heavy outer hull, no hairline detail, transparent background, centered subject | One subject phrase at 48dp without label |
| **`ca-glow-cutout-v1`** | Dark mass + single cyan rim light, minimal interior detail, transparent background | Reads at 24dp TV thumbnail |
| **`ca-badge-medallion-v1`** | Circular crop, emblem centered, thick outer stroke, transparent background | Works inside medallion stage |

## Example prompts (Eidolon / external)

**Monolith — fleet beacon**

```text
Control Alt monolith icon, single fleet beacon chevron, solid cyan-teal silhouette,
minimal interior, no text, transparent background, centered, game notification hero asset,
thick readable shapes for TV thumbnail
```

**Glow cutout — alert sigil**

```text
Control Alt glow-cutout icon, dark navy mass with cyan edge light, simple alert sigil,
no text, transparent background, centered, readable at 24px
```

## Acceptance rubric (operator §4)

1. Name the subject in one phrase (e.g. “fleet beacon”) at Paintbox TV size.
2. No emoji fallback required on derive-preview.
3. Optional: register with `representation_kind: image` or dual `image_layers` (6b).

Assets live under `config/hails/glyph-hero-images/`.

## Exemplars

| Glyph id | Style base | Template | Demo hail |
| --- | --- | --- | --- |
| `custom-fleet-beacon` | `ca-monolith-v1` | `stage-breakout-v1` | `hail.fleet_beacon.001` |
| `custom-warden-sigil` | `ca-glow-cutout-v1` | `stage-medallion-v1` | `hail.warden_alert.001` |
| `custom-combadge` | `ca-badge-medallion-v1` | `stage-medallion-v1` | `hail.combadge.001` (operator) |

Fixtures: `config/hails/glyph-exemplars/raster-*.v001.json` and `config/hails/fixtures/raster-*-demo.hail.json`.

## Operator workflow

1. Generate PNG against a style-base prompt (Eidolon or external tool).
2. Apply **acceptance rubric** below at Paintbox TV size.
3. Promote asset:

   ```bash
   python3 scripts/promote-raster-glyph-hero.py reports/your-export.png \
     --output-name custom-your-glyph.png --size 512 --key-background
   ```

4. Copy/adapt an exemplar JSON under `config/hails/glyph-exemplars/`.
5. Upsert + send:

   ```bash
   python3 scripts/send-raster-demo.py http://192.168.68.93:7895 \
     --glyph-exemplar config/hails/glyph-exemplars/raster-your-glyph.v001.json \
     --hail-fixture config/hails/fixtures/raster-your-demo.hail.json \
     --hail-id hail.your_demo.001 --send --room arcade
   ```

Shortcut scripts: `./scripts/send-fleet-beacon-demo.sh`, `./scripts/send-warden-alert-demo.sh`.

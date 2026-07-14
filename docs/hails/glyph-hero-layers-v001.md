# Glyph Hero image layers v001 (6b framework)

**Status:** Framework — Paintbox compositor + consumer payload; APK multi-layer composite **deferred**.

## When to use

| Mode | Spec |
| --- | --- |
| Single PNG | `representation_kind: image` + `image_asset.path` |
| Dual-layer (6b) | Same + `image_layers[]` with ≥2 entries |

## Layer roles

| Role | Typical content |
| --- | --- |
| `mass` | Primary silhouette (required) |
| `accent` | Secondary highlight (optional pulse at `pulse_anchor`) |
| `ground` | Rare backing plate |

## Example

```json
{
  "representation_kind": "image",
  "image_layers": [
    { "role": "mass", "path": "custom-fleet-beacon-mass.png", "z_index": 0 },
    {
      "role": "accent",
      "path": "custom-fleet-beacon-accent.png",
      "z_index": 1,
      "pulse_anchor": "glyphImpactPeak"
    }
  ]
}
```

## Consumer payload

`glyph_render.kind === "image_layers"` with ordered `layers[]` (`image_url` authoring, `image_base64` APK).

Schema: [`config/hails/glyph-image-layers.schema.v001.json`](../../config/hails/glyph-image-layers.schema.v001.json).

## Paintbox

[`HailLayeredGlyph.tsx`](../../frontend/src/components/HailLayeredGlyph.tsx) stacks layer images; accent pulse uses registry preview phase + `pulse_anchor`.

## Defer

APK synchronized multi-layer timing parity — see [`presentation-capability-matrix-v001.md`](presentation-capability-matrix-v001.md).

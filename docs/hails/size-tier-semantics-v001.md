# Hail size tier semantics v001

**Issue:** AptlyClever/ctrl-alt-axiom#84  
**Contract:** `config/hails/hail-render-contract.v001.json` → `runtimeModel`, `previewVisual.paintBox.tiers`  
**Implementation:** `backend/hails_render_contract.py` → `normalize_size_tier()`, `resolve_size_code()`

---

## Terms

| Term | Meaning |
| --- | --- |
| **size tier** | Runtime string: `small`, `medium`, or `large` |
| **size code** | Compact letter: `S`, `M`, or `L` — derived from tier |
| **catalog input** | Hail record `visual.scale` (primary) or `visual.size_tier` (alias) |
| **consumer output** | Render-payload fields `size_tier` and `size_code` |

Axiom owns tier definitions and Paint Box fractions. LCARD and Android **consume** normalized tier strings; they do not define tier geometry.

---

## Normalization rules

```python
# backend/hails_render_contract.py
normalize_size_tier(scale)  # → small | medium | large
resolve_size_code(scale)    # → S | M | L
```

| Input | `size_tier` | `size_code` |
| --- | --- | --- |
| `small`, `s` | `small` | `S` |
| `medium`, `m`, null, `""` | `medium` | `M` |
| `large`, `l` | `large` | `L` |
| `S`, `M`, `L` | via `runtimeModel.sizeTierMap` | same letter |
| unknown string | `medium` (fallback) | `M` |

LCARD broker proof and Android proof validation use the same fallback (`medium`) when `size_tier` is missing on overlay POST.

---

## Paint Box geometry per tier

From `previewVisual.paintBox.tiers` (authoritative for layout fractions):

| Tier | Code | width × height fraction | glyphVisualFraction | floor px |
| --- | --- | --- | --- | --- |
| small | S | 0.24 × 0.26 | 0.46 | 108 |
| medium | M | 0.32 × 0.34 | 0.50 | 152 |
| large | L | 0.42 × 0.44 | 0.54 | 208 |

**Glyph visual size:**

```text
glyphVisualSizePx = max(glyphVisualSizeFloorPx, paintBoxHeightPx × glyphVisualFraction)
```

Medium example @ 1920×1080: `max(152, 367.2 × 0.5) = 183.6px`.

This is the rule documented in LCARD #180 and Android `PaintBoxLayout.kt` — not the older safe-zone-width fraction used before tier support.

---

## Downstream mapping chain

```text
Axiom hail.visual.scale
  → build_consumer_render_payload() → size_tier + size_code
  → LCARD axiom-hail-render-payload-adapter.js → overlay.size_tier
  → hail-overlay-broker-proof.js → canonical field 11
  → Android PaintBoxTier.resolve() → PaintBoxLayout geometry
```

Non-transporter effects (`pop`, `burst`, `none`) may carry tier in the render-payload but **Android production rejects** non-`transporter_beam` overlay effects today.

---

## Tests

| Test file | Coverage |
| --- | --- |
| `tests/test_hails_render_contract.py` | normalization, seed payloads, API render-payload, downstream projection |
| `tests/test_lcard_hail_seed.py` | seed catalog `visual.scale` presence |

LCARD-side proof tests live in `control-alt-lcard` (not run under this issue).

---

## Operator guidance

- Set hail size in catalog via `visual.scale`: `small`, `medium`, or `large`.
- `size_code` is **derived** — do not store independently on hail records.
- Missing scale defaults to **medium** everywhere in the consumer chain.

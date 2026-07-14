# Paintbox authoring chrome v001 (locked)

**Status:** **Locked implementation authority** for Forge + Hails studio preview frames.  
**Render parity:** `hails-render-parity-v001.md` §2 (Shell layer)  
**Forge intents:** `forge-authoring-intents-v001.md`  
**Code:** `frontend/src/hailAuthoringPaintboxChrome.ts`, `HailPaintboxPreview.tsx`

---

## Rule

**One fixed paintbox size everywhere. Modes scale inward — they never resize the viewport or swap container types.**

| Constant | Value |
| --- | --- |
| Viewport | **18rem × 16rem** (Forge, Hails edit, New Hail) |
| Grid column | `md:grid-cols-[18rem_minmax(0,1fr)]` |

Effects On/Off, Design view, and TV size all render **inside this frame**.

---

## DOM contract

```text
[data-hail-authoring-preview-viewport]     ← fixed 18×16rem
  [data-hail-paintbox-stage]               ← chrome: bare | shell
    [data-hail-paintbox-anchor]             ← compose: placement_id; glyph/effect: center
      [data-hail-paintbox-cluster]         ← --hail-authoring-glyph-scale
        [data-hail-paintbox-hero]
          [data-hail-package]              ← absolute inset-0; tier-sized binding box (package-first)
            [data-hail-effect-layer]       ← effect choreography
            [data-hail-glyph-layer]        ← flex center; full package
              [data-hail-glyph-artwork]    ← glyph resolve / motion target
        [data-hail-paintbox-message]
```

**Binding model:** `hail-authoring-package-v001.md`

---

## Scale modes (Glyph Forge)

Same paintbox; only **`--hail-authoring-glyph-scale`** and consumer glyph size tier change.

| Mode | Control label | Scale | Envelope | Purpose |
| --- | --- | --- | --- | --- |
| **`design`** | **Design view** (default) | ×1.35 on mark | Full paintbox | Legibility — judge the forged Glyph |
| **`delivery`** | **TV size** / Hails compose | `glyphVisualFraction` × boost | `PAINTBOX_TIERS` from S/M/L | Package size on TV; shared Forge/Hails geometry |

Message and Shell preview chips are always available on Glyph Forge (defaults off until toggled).

**Do not use** “proof” in operator copy.

---

## Unified Forge + Hails preview (addendum)

**Plan:** `paintbox-authoring-preview-unified-plan-v001.md` · **Chips:** `preview-chip-sets-v001.md`

| Scale mode | Surfaces |
| --- | --- |
| **`design`** | Forge Design view only — centered, legibility boost, no tier envelope shrink |
| **`delivery`** | Hails `compose` (always); Forge TV size; Effect Forge reference glyph — `PAINTBOX_TIERS` envelope + `glyphVisualFraction` |

Forge TV size and Hails edit must match package geometry for the same `visual.scale`; only anchor (`center` vs `placement_id`) differs.

---

## Anchor behavior

| Intent | Anchor |
| --- | --- |
| **`glyph`**, **`effect`** | **Center** of paintbox (`data-hail-paintbox-anchor="center"`) |
| **`compose`** (Hails edit) | **`placement_id`** (upper_center, center, lower_center) + size tier box |

Effects toggle **must not** change anchor mode or viewport size.

---

## Chrome modes

| Mode | When |
| --- | --- |
| **`bare`** | Default — no dashed boxes, no `cardClass`, no palette panel tint |
| **`shell`** | Any authoring surface + Shell chip on — one subtle viewport border |

Profile/browse may keep legacy dashed effect-zone chrome — not Forge or Hails edit.

---

## Prohibited

- Resizing viewport between Design view and TV size
- Profile dashed effect card on Forge/Hails edit
- Switching `authoringIntent` to `compose` when entering TV size view
- Scaling glyph artwork without the effect envelope

---

## Verification

```bash
cd frontend && npm run build
node scripts/verify-hails-forge-authoring-intents-v001.mjs
node scripts/verify-hails-paintbox-authoring-chrome-v001.mjs
```

---

## Related

- `effects-enhancement-v001.md` — palette does not drive preview card border
- `forge-authoring-intents-v001.md` — intent defaults

# Preview chip sets — authoring surfaces

**Authority:** `hail-authoring-surface-contract-v001.md` · `paintbox-authoring-preview-unified-plan-v001.md` · `hailAuthoringPreviewChipSet.ts`

One chip catalog, filtered by `authoringIntent`. Canon terms **Glyph** and **Effect** are never renamed. Labels are nouns; **active** state is visual + `aria-pressed`, not “On/Off” suffixes.

| Intent | Surface | Chips (in order) |
| --- | --- | --- |
| `compose` | Hails edit | Effect · Message · Shell |
| `glyph` | Forge → Glyphs | Design view · TV size · Effect · Message · Shell · Regenerate · Reset · Recipe* |
| `effect` | Forge → Effects | Glyph · Shell |

\*Recipe is a non-interactive meta chip (Forge glyph, Design view only). Effect motion is always on in Effect Forge — no Effect chip.

Message and Shell chips on Glyph Forge are always available (not gated to TV size).

Loadout chips (Size, Color, Effect, Variation) remain in the column beside the preview — not in this strip.

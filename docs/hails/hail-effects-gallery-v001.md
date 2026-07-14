# Hail Effects Gallery v001

First **Effects Gallery** for **Hails Composer** — named **Effect Presets** that map to existing visual contract fields so operators choose a **Presentation Style** without wiring render fields.

## Product flow

> Pick or create the Glyph. Pick the effect. Preview the Hail. Save.

1. Open **Hails Composer** (create or edit).
2. Browse **Hail Effects** / **Effects Gallery**.
3. **Apply Effect** on a preset card.
4. **Paintbox Preview** updates locally with the preset label/summary.
5. Optionally **Customize** fine-tuning controls below the gallery.
6. **Save Hail**.

## Presets (v001)

| Preset | Effect | Palette | Size | Notes |
| --- | --- | --- | --- | --- |
| Transporter Sweep | transporter | axiom_dark_cyan | medium | Operational sci-fi beam |
| Priority Pulse | burst | transporter_white | large | Urgent, faster duration |
| Soft Ping | pop | cute_purple | medium | Casual, gentle fade |
| Scanner Pass | transporter | transporter_white | large | Cool sweep / slide-up |
| Quiet Signal | none | axiom_dark_cyan | small | **Low motion** — reduced-motion option |

Canonical config: `config/hails/hail-effects-gallery.v001.json`

## Modules

| Artifact | Path |
| --- | --- |
| Gallery config | `config/hails/hail-effects-gallery.v001.json` |
| Backend loader/validator | `backend/hail_effects_gallery.py` |
| Frontend helpers | `frontend/src/hailEffectsGallery.ts` |
| Gallery UI | `frontend/src/components/HailEffectsGallery.tsx` |
| Composer wiring | `frontend/src/components/HailsComposerDialog.tsx` |

## API

`GET /api/hails` includes:

- `effects_gallery` — summary (preset count, reduced-motion ids)
- `effect_presets` — preset rows for Composer

## Reduced motion

**Quiet Signal** is the first explicit low-motion preset (`reduced_motion: true`, `animation_enabled: false`, `effect_id: none`). This is the start of reduced-motion consideration in Composer — not a full accessibility audit.

## Boundaries

No marketplace/store/economy, image generation, production artwork pipeline, import/approval UX, Android/LCARD/runtime contact, deployment, or visual proof in this slice.

## See also

- [Hails Composer v001](./hails-composer-v001.md)
- [Hails Composer v002 edit mode](./hails-composer-v002-edit-existing.md)

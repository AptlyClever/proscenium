# Hails page template bindings v001 — implementation companion

**Authority:** `AptlyClever/praxis:objects/doctrines/axiom-hails-page-template-bindings-v001.md`  
**Surface contract:** `hail-authoring-surface-contract-v001.md` (compositor + view + definition planes)

Repo-local map from page-template region IDs to components and verifiers. Praxis bindings doctrine wins on product decisions.

## Template instances (vendored from standards)

| Template ID | Route | JSON artifact |
| --- | --- | --- |
| `axiom.hails.management.v001` | `#/axiom/hails` | `vendor/standards-build-context/contracts/page-templates/axiom-hails-management.v001.json` |
| `axiom.hails.forge.v001` | `#/axiom/hails/forge` | `vendor/standards-build-context/contracts/page-templates/axiom-hails-forge.v001.json` |
| `axiom.hails.plot.v001` *(interim)* | `#/axiom/hails/plot` | *pending* — route + DOM regions in `GlyphPlotView`; promote to standards when step 24 exits |

**Plot surface doctrine:** `doctrine-axiom-judgment-scale-plot-surface-v001` — mirror `docs/praxis/judgment-scale-plot-surface-px001.md`.

Sync after standards edits:

```bash
./scripts/sync-standards-build-context.sh
```

Hub discovery (read-only, not effective payload): `config/apps.registry.yaml` → `axiom.page_templates[]`.

## DOM contract

| Attribute | Usage |
| --- | --- |
| `data-page-template-id` | Page root — template identity from JSON |
| `data-page-template-state` | Page root — derived UI state |
| `data-page-template-region` | Region wrapper — maps to `regions[].id` in template JSON |

## Hails management — component map

| Region | Component |
| --- | --- |
| `ownership_summary` | `HailsView` header |
| `hail_inventory` | `HailStudioLibrary` |
| `definition_editor` | `HailStudioEditPanel` — HASC preview+loadout band, then glyph strip and hail fields |
| `delivery_policy_route_editor` | `HailStudioEditPanel` route row |
| `visual_contract_readiness` | `HailStudioBackstage` |
| `technical_signals` | `HailStudioBackstage` |
| `advanced_operator_send` | `HailStudioBackstage` |

State: `derivePageTemplateState()` in `hailDeliveryRoutes.ts`.

## Hail Forge — component map

| Region | Component |
| --- | --- |
| `ownership_summary` | `HailForgeView` header |
| `library_picker` | `HailForgeLibrary` |
| `authoring_preview_loadout` | `HailForgeGlyphWorkspace` / `HailForgeEffectWorkspace` — HASC compositor + loadout band |

**HASC:** Same logical band as Hails `definition_editor` preview row — `hailAuthoringPreviewLoadoutGridClass`, `HailRegistryAuthoringPreviewStack`.
| `authoring_identity_editor` | Glyph creator / Effect name fields |
| `authoring_persistence_actions` | Save / Reset / Delete rows |

State: `deriveForgePageTemplateState()` in `hailForgePageTemplate.ts`.

## Glyph Plot — interim component map

| Region | Component |
| --- | --- |
| `ownership_summary` | `GlyphPlotView` header |
| `operator_p1_instructions` | P1 squint instructions panel |
| `fixture_picker` | Plot fixture tab row |
| `plot_gate_status` | Gate badge + automated errors |
| `judgment_scale_panels` | 48 / 96 / 24dp (8×) proof panels |

Page root: `data-page-template-id="axiom.hails.plot.v001"` on `GlyphPlotView`.

## Verification

```bash
cd frontend
npm run verify:hails-authoring-surface-contract
npm run verify:page-templates
node scripts/verify-hails-forge-page-template-v001.mjs
node scripts/verify-hails-forge-page-v001.mjs
npm run verify:hails-page-template
```

## Theme boundary

Page templates describe **layout and disclosure**. Theme tokens and branding continue to flow through vendored `--ca-*` CSS and `GET /api/effective/axiom` — do not merge template JSON into effective payload.

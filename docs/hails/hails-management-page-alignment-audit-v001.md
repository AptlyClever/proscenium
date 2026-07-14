# Hails Management Page Alignment Audit v001

Static product-surface audit of Hails Management after Composer/Glyph/Effects/Preview work (issue #116).

**Verdict: mostly coherent** — Composer is the primary authoring path; list and inspector need minor copy/hierarchy polish; Visual contract tab is appropriately demoted but still a parallel editor.

Inspection only — no deployment, runtime validation, or visual proof.

## Primary questions answered

| Question | Finding |
| --- | --- |
| Is Composer clearly the primary workflow? | **Yes** — Create New Hail + Edit Hail open `HailsComposerDialog`; guided five-step flow |
| Are Visual Contract and Route panels still useful? | **Yes, secondary** — Advanced visual tab demoted with helper text; Route + More options for delivery/technical |
| Are content/Glyph/effect/delivery separated? | **Composer: yes** — Page inspector still merges preview + tabs |
| Do list cards show the right state? | **Mostly** — friendly summary line added; readiness still diagnostic |
| Archived/custom Glyph on page? | **Partial** — Composer/Paintbox clear; list uses catalog labels, not archived badge |
| Validation errors understandable? | **Improved** — inspector uses “Could not save Hail” (aligned with Composer) |
| Advanced settings protected? | **Yes** — More options + collapsed receipts; route ids monospace there |
| Plumbing terms in main flow? | **Low** — no candidate/staging; list had monospace contract ids (fixed) |
| Sharp edges before proof planning? | **Documented below** — dual editor, route dialog, custom glyph medallion |

## Page structure

```
Hails Management (HailsView)
├── ownership_summary — page helper (visible)
├── hail_inventory — list + Create New Hail
└── inspector panel
    ├── Preview — stable harness
    ├── Advanced visual — HailVisualContractPanel (secondary)
    ├── Edit Hail — opens Composer
    ├── Route — friendly route cards + Edit route dialog
    └── More options — archive, behavior, full RouteEditor, technical JSON
```

Composer modal is primary create/edit; not a page-template region (by design).

## Alignment fixes in this slice

| Fix | Rationale |
| --- | --- |
| List summary uses friendly labels (`hailComposerLabels`, `glyphSelectorLabel`) | Removes monospace plumbing from inventory |
| Empty state references **Create New Hail** | Matches primary action button |
| Inspector save errors → “Could not save Hail” | Matches Composer tone |
| Visual contract tab → **Advanced visual** + Composer pointer | Clarifies secondary role |
| `ownership_summary` on visible helper text | Template region no longer hidden-only |

## Deferred follow-ups

1. **Dual definition editors** — Visual contract panel still editable; consider read-only + “Edit in Composer” default
2. **Custom glyph medallion on list** — emoji fallback like Paintbox preview
3. **Archived badge on list/inspector** — when hail references archived custom glyph
4. **Edit route dialog** — warn when replacing multi-route hail with single route
5. **Visual contract derived preview** — snake_case field labels in panel
6. **Legacy unused components** — `HailManagementConsole`, `HailDefinitionsPreview` (not on page)

## Controlled proof planning notes

Before proof, use Runtime Readiness Audit checklist (`hails-runtime-readiness-audit-v001.md`). Page alignment does not block proof but operators should prefer **Edit Hail** / **Create New Hail** over Advanced visual for definition changes.

## Related docs

- `hails-composer-polish-v001.md`
- `hails-runtime-readiness-audit-v001.md`
- `hails-composer-v002-edit-existing.md`

# Hails Studio E — Edit wireframe acceptance (implementation companion)

**Praxis SoT:** `AptlyClever/praxis:objects/doctrines/axiom-hails-edit-studio-layout.md`

**Status:** Operator PASS (2026-06-15); revision may follow  
**Branch:** `campaign/hails-studio-b-inline-edit`  
**Deploy:** `http://192.168.68.93:7895/#/axiom/hails`

> This file mirrors the Praxis doctrine for repo-local agent context. On conflict, the Praxis doctrine wins.

## Wireframe (edit workspace)

```text
Picker | Workspace
       [ gutter pl-8 lg:pl-10 — ONE wrapper ]
         [ preview — hero glyph ] | Size / Color / Effect
         Glyph (compact strip)
         Name · Message · Route · Save
```

## Row order (edit)

1. Preview \| Size / Color / Effect  
2. Glyph strip  
3. Name, Message, From / To / Delivery, Save  

New Hail Beat 1: glyph strip may precede preview + loadout.

## Operator checklist (2026-06-15)

| # | Criterion | Result |
| --- | --- | --- |
| 1 | One inset workspace block | PASS |
| 2 | Compact glyph strip | PASS |
| 3 | Hero glyph preview; no edit sweep | PASS |
| 4 | Preview left \| loadout right; fields below glyph strip | PASS |
| 5 | New Hail Beat 1 acceptable | PASS |
| 6 | Save; Advanced collapsed | PASS |

## Implementation record

| Field | Value |
| --- | --- |
| Studio E | `1467a02` |
| Studio E1 (preview-first, hero) | `fd35d55` |
| Verifiers | `verify-hails-studio-e-wireframe.mjs`, `verify-hails-studio-d-layout.mjs` |

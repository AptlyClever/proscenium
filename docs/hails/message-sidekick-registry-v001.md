# Message Sidekick registry v001

**Status:** Active — implementation authority for Message Sidekick layer  
**Praxis:** `pso-20260621-axiom-message-sidekick-registry`  
**Parent:** `pso-20260620-hails-collective-beta` (slice **B8**)  
**Contract:** `config/hails/hail-render-contract.v002-beta.json` → `previewVisual.messageRegistry`  
**Supersedes:** Effect-owned message reveal (`messageRevealStyle`, `messageRevealStart`) for delivery and preview

---

## Purpose

**Message Sidekick** is the fourth composed layer in the Hail Package:

| Layer | Role |
| --- | --- |
| **Glyph Hero** | Identity mark — star of the show |
| **Effects Sidekick** | What happens **to** the Hero during entrance/exit |
| **Message Sidekick** | Copy presentation during **stable hold** |
| **Shell** | Placement, tier, palette, `layout_regions` |

Message timing is **not** owned by the Effects Sidekick.

---

## Lifecycle (locked)

```text
Effects entrance     → glyph + field choreography
stable_hold t=0      → Message fade IN begins (speed tier)
stable_hold middle   → message readable at target opacity
stable_hold end      → Message fade OUT completes (speed tier)
Effects exit         → glyph/field departure
cleared
```

- `visual.duration_ms` = **`stable_hold_ms` only** (unchanged Collective Beta rule).
- Message fade durations are **inside** the stable window.

---

## Speed tiers

| Tier id | UI label | Entrance ms | Exit ms |
| --- | --- | --- | --- |
| `slow` | Slow | 720 | 540 |
| `normal` | Normal | 480 | 360 |
| `quick` | Quick | 240 | 180 |

Per-hail tuning may set `entrance_speed_tier` and `exit_speed_tier` independently.

---

## Registry location

Embedded in render contract as **`messageRegistry`** (parallel to `effectRegistry`).

Default entry: **`secondary_fade`** — fade in/out, normal speed, opacity 0.92, color from palette `message`.

---

## Per-hail fields

| Field | Location | Notes |
| --- | --- | --- |
| `message.short_text` | hail record | Copy |
| `visual.message_sidekick_id` | hail record | Registry entry id |
| `visual.message_tuning` | hail record | `opacity`, `entrance_speed_tier`, `exit_speed_tier` |
| `message_entity` | compose payload | Resolved snapshot at Save |
| `message_identity` | compose payload | Registry identity + tuning merge |

---

## `message_entity` shape (v2 extension)

```json
{
  "text": "Hello TV",
  "sidekick_id": "secondary_fade",
  "entrance_style": "fade",
  "exit_style": "fade",
  "entrance_speed_tier": "normal",
  "exit_speed_tier": "normal",
  "entrance_ms": 480,
  "exit_ms": 360,
  "opacity": 0.92,
  "color_source": "palette_message",
  "entrance_offset_ms": 0,
  "exit_offset_ms": 4640,
  "stable_hold_ms": 5000
}
```

- `entrance_offset_ms` — always `0` (stable start).
- `exit_offset_ms` — `stable_hold_ms − exit_ms`.

Legacy fields `reveal_style`, `reveal_delay_ms`, `reveal_duration_ms` are **not** populated from effect anchors.

---

## Package DOM (v002)

Inside `data-hail-package`:

```html
<div data-hail-message-layer data-hail-paintbox-message>…</div>
```

Positioned via `layout_regions.message_band`. No effect CSS vars or beam shaders on this layer.

---

## Superseded documentation

| Doc | Change |
| --- | --- |
| `animation-language-v001.md` | Message primary during stable hold, not effect entrance |
| `hails-render-parity-v001.md` | Message Sidekick owns stable fades |
| `effect-registry-v001.md` | `messageRevealStyle` deprecated for delivery |
| `hail-authoring-package-v001.md` | Message inside package bounds (v002) |

---

## APK consume (M4)

`control-alt-lcard/hail-overlay-poc`:

- `MessageSidekickTiming.kt` — parses `message_entity` (`entrance_ms`, `exit_ms`, `opacity`, `exit_offset_ms`)
- `TransporterLifecycle.computeMessageAlphaStable` — stable-phase fade in/out
- Effect entrance/exit phases force `messageAlpha = 0` when `useStablePhase`

Legacy payloads with only `reveal_delay_ms` still use effect entrance choreography.

---

## Implementation status

| Slice | Status |
| --- | --- |
| M0 Praxis + this doc | shipped |
| M1 Contract + backend | shipped |
| M2 Preview lifecycle | shipped |
| M3 Compose UI | shipped |
| M4 APK consume | shipped |
| M5 Verify B8 | shipped |

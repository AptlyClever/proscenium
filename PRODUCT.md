# Product — Proscenium

## Users

Control Alt operators and room-facing consumers (LCARD / TV / speakers) that present themed visual and audio experiences in the home.

## Product purpose

**Proscenium owns anything visual and audio happening in the home.** It is the stage; products are the shows. **Hails is the flagship product** (themed notifications, Glyph Heroes, Paintbox, effects) and lives inside Proscenium — it does not branch into its own app, because Hails *is* presentation, the platform's core. Proscenium grows by adding delivery pathways (Bandit first), TV overlays, and audio cues — while running as a dedicated leaf app that consumes themes/branding from Axiom rather than living inside the hub.

## Principles

1. Axiom is fleet authority for registry/themes; Proscenium owns presentation domain logic and delivery.
2. Hails stays a resident product of Proscenium. Branch it out only if it ever develops an independent runtime other platforms need.
3. Paintbox ↔ consumer parity remains binding (`docs/hails/hails-render-parity-v002.md`).
4. No new procedural generation while plot-proof is frozen — raster presentation pivot first.
5. Grow by adding delivery paths and media kinds — not by absorbing hub responsibilities (registry, themes SoT, deploy).
6. Product delivery is adapter-based: Proscenium owns target/action routing; Bandit and other products retain domain state and renderer semantics.

## Naming

Plain product name, no `ctrl-alt-*` prefix (convention retired 2026-07-14). Directory `proscenium`; Axiom registry id `proscenium`. **Hail** remains the product vocabulary for one themed notification.

# Proscenium product delivery

Proscenium is the home presentation authority. Products remain authoritative
for their own state and visuals; Proscenium selects a display target and invokes
that target's product adapter.

## Runtime shape

```text
operator client (LCARD)
  -> Proscenium product action
  -> target product adapter in Overlay APK
  -> product renderer / state stream
```

Current adapters:

- `hails`: Proscenium composes the Hail package and POSTs `/hail/show` to the
  native Android Hail renderer.
- `bandit`: Proscenium POSTs `/bandit/show` or `/bandit/dismiss`; the Android
  adapter hosts Bandit's server-authoritative `/overlay` WebView and stream.

LCARD never translates Bandit outcomes into Hails and never selects device URLs.

## Registry

`config/presentation/delivery-targets.json` is the target/product capability
registry. Device URLs stay server-side. The public capability endpoint omits
them.

## API

- `GET /api/presentation/products`
- `POST /api/presentation/products/{product_id}/show`
- `POST /api/presentation/products/{product_id}/dismiss`

Example:

```json
{
  "delivery_target_id": "arcade",
  "payload": {
    "ws_url": "ws://192.168.68.93:8766/api/games/slots/stream"
  }
}
```

The `ws_url` override is optional for Bandit; its normal source is the
server-side target registry.

## Ownership

- Proscenium: target inventory, product adapter selection, delivery action.
- Hails: resident Proscenium product and package/choreography domain.
- Bandit: game/session authority and machine renderer.
- Overlay APK: physical renderer host and product adapters. Source lives in
  this repo at [`overlay-apk/`](../overlay-apk/) (moved from
  `control-alt-lcard/hail-overlay-poc/` on 2026-07-15, history preserved).
- LCARD: operator controls that trigger Proscenium actions.
- Vellum: media conversion and game-ready catalog.

# Control Alt Hails overlay APK — versioning

**Package:** `com.controlalt.hailoverlay`  
**Product line:** G2 overlay rewrite (service-owned listener, broker-gated dynamic Hails)

## Runtime version fields

| Field | Source | Purpose |
| --- | --- | --- |
| `versionName` | `hail-overlay-poc/app/build.gradle.kts` | Operator-facing semver string; echoed by `GET /health` |
| `versionCode` | same | Monotonic Android install ordering (`adb install` downgrade guard) |

Current G2 baseline:

```kotlin
versionName = "2.0.0-alpha.2"
versionCode = 2000002
```

## versionCode scheme (G2+)

G2 resets the overlay rewrite line away from legacy `1.0.x-v001` POC increments.

| Component | Rule |
| --- | --- |
| Major band | `2_000_000` base for G2 overlay rewrite |
| Increment | +1 per shipped APK on the PR branch or release tag |
| Example | `2.0.0-alpha.1` → `2000001`; next alpha → `2000002` |

Legacy POC builds (`1.0.0-v001` … `1.0.9-v001`, versionCode 1–14) are historical only. Do not reuse those codes after G2 reset.

## versionName scheme

Follow semver with optional pre-release tag for Arcade validation builds:

```text
MAJOR.MINOR.PATCH[-prerelease.N]
```

- **MAJOR 2** — G2 architecture (launcher trampoline + foreground service listener + broker proof).
- **alpha** — pre-promotion Arcade/homelab builds on PR branches.
- Drop `-alpha.N` when promoting a tagged release to household TVs.

## Health endpoint contract

`GET /health` returns `version` from `BuildConfig.VERSION_NAME` (not a hardcoded string). After bumping Gradle versions, rebuild and reinstall; do not expect `/health` to change until a new APK is on device.

## Broker secret coupling

APK builds require `LCARD_OVERLAY_BROKER_SECRET` (min 16 chars) at compile time. Version bumps do not change broker proof semantics (PR #171 contract preserved).

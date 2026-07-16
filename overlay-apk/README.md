# Control Alt Overlay APK

Google TV / Android TV overlay renderer host, owned by Proscenium as its
physical presentation delivery runtime. One APK
(`com.controlalt.hailoverlay`) hosts the product adapters Proscenium invokes:

- **Hails** — `POST /hail/show`, `GET /health` on port `8765`
- **Bandit** — `POST /bandit/show`, `POST /bandit/dismiss`, `GET /health` on
  port `8767` (mounts Bandit's `/overlay?embed=apk` WebView)

Moved from `control-alt-lcard/hail-overlay-poc/` on 2026-07-15
(history-preserving subtree; see proscenium#1). The Android package name is
unchanged to avoid reinstall/permission churn on the TVs.

## Build (Android Studio or CLI)

Requirements:

- JDK 17+
- Android SDK 34 (platform + build-tools 34.0.0)

No system JDK? Run `./scripts/setup-jdk.sh` — installs a portable Temurin 17 under
`~/.local/jdks/` and points Gradle at it via `~/.gradle/gradle.properties` (host-local,
not tracked by this repo, same convention as `.tools/android-sdk`). Idempotent, safe
to re-run.

Unit tests (`./gradlew test`) also need a broker secret in the environment (any
local value, 16+ chars — **not** the real production secret):

```bash
export LCARD_OVERLAY_BROKER_SECRET="dev-local-test-secret-only-not-for-prod"
```

```bash
cd overlay-apk
./gradlew assembleDebug
```

Debug APK output:

`app/build/outputs/apk/debug/app-debug.apk`

**Historical v0.1.1-poc artifact (Compose overlay crash fix, POC era):**

`artifacts/control-alt-hail-overlay-poc-v0.1.1-poc-debug.apk`

Release (unsigned):

```bash
./gradlew assembleRelease
```

`app/build/outputs/apk/release/app-release-unsigned.apk`

## Install and provision (Google TV)

**Arcade (recommended):**

```bash
cd overlay-apk
./scripts/deploy-arcade-apk.sh           # install + start listener + health check
./scripts/deploy-arcade-apk.sh --build   # build then deploy
```

**Manual:**

```bash
adb connect <tv-ip>
adb install -r app/build/outputs/apk/debug/app-debug.apk
adb shell am start -n com.controlalt.hailoverlay/.LauncherStartActivity
adb shell appops set com.controlalt.hailoverlay SYSTEM_ALERT_WINDOW allow
adb shell dumpsys deviceidle whitelist +com.controlalt.hailoverlay   # recommended for idle residency
```

`adb install` alone does **not** start the HTTP listener (Praxis #173). The launcher trampoline step is required after every install. After boot, alpha.41+ `BootReceiver` starts the service without requiring overlay permission first.

**Residency (alpha.41+):** `BootReceiver` starts the foreground adapter host on
`BOOT_COMPLETED` / `MY_PACKAGE_REPLACED` even without overlay permission (HTTP
bind does not need it). A 60s in-service watchdog re-binds Hails `8765` and
Bandit `8767` if they drop. Deploy health checks **both** ports. Battery /
`deviceidle` whitelist is still recommended for long-idle TVs:

```bash
adb shell dumpsys deviceidle whitelist +com.controlalt.hailoverlay
```

Bandit WebView loads use `LOAD_NO_CACHE` plus a cache-bust query so Bandit
server redeploys reach the TV without a manual DevTools reload.

## Trigger hail

```bash
curl -sS -X POST "http://<tv-ip>:8765/hail/show" \
  -H "Content-Type: application/json" \
  -d '{
    "effect_id": "transporter_beam",
    "glyph_id": "default",
    "message": "What'\''s sniffing?",
    "duration_ms": 5500
  }'
```

Health check:

```bash
curl -sS "http://<tv-ip>:8765/health"
```

## Allowlisted payload (PoC)

Only this schema is accepted; all fields must match allowlists:

| Field | Allowed values |
|-------|----------------|
| `effect_id` | `transporter_beam` |
| `glyph_id` | `default` |
| `message` | `Spoon transporter check` |
| `duration_ms` | `1000`–`30000` |

Non-allowlisted requests return HTTP 400.

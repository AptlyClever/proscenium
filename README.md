# Control Alt Hail Overlay PoC

Minimal Google TV / Android TV proof-of-capability APK for true Hail visual overlay.

## Build (Android Studio or CLI)

Requirements:

- JDK 17+
- Android SDK 34 (platform + build-tools 34.0.0)

```bash
cd hail-overlay-poc
./gradlew assembleDebug
```

Debug APK output:

`app/build/outputs/apk/debug/app-debug.apk`

**v0.1.1-poc artifact (Compose overlay crash fix):**

`artifacts/control-alt-hail-overlay-poc-v0.1.1-poc-debug.apk`

Release (unsigned):

```bash
./gradlew assembleRelease
```

`app/build/outputs/apk/release/app-release-unsigned.apk`

## Install and provision (Google TV)

**Arcade (recommended):**

```bash
cd hail-overlay-poc
./scripts/deploy-arcade-apk.sh           # install + start listener + health check
./scripts/deploy-arcade-apk.sh --build   # build then deploy
```

**Manual:**

```bash
adb connect <tv-ip>
adb install -r app/build/outputs/apk/debug/app-debug.apk
adb shell am start -n com.controlalt.hailoverlay/.LauncherStartActivity
adb shell appops set com.controlalt.hailoverlay SYSTEM_ALERT_WINDOW allow
adb shell dumpsys deviceidle whitelist +com.controlalt.hailoverlay   # optional
```

`adb install` alone does **not** start the HTTP listener (Praxis #173). The launcher trampoline step is required after every install.

## Trigger hail

```bash
curl -sS -X POST "http://<tv-ip>:8765/hail/show" \
  -H "Content-Type: application/json" \
  -d '{
    "effect_id": "transporter_beam",
    "glyph_id": "hail-sniffer",
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
| `glyph_id` | `hail-sniffer` |
| `message` | `What's sniffing?` |
| `duration_ms` | `1000`–`30000` |

Non-allowlisted requests return HTTP 400.

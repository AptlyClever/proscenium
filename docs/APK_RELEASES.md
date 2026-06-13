# Control Alt Hails overlay APK — release log

Operator-facing history for `com.controlalt.hailoverlay` on Google TV / Android TV.

See **`APK_VERSIONING.md`** for scheme rules.

## G2 overlay rewrite

| versionName | versionCode | Branch / PR | Notes |
| --- | --- | --- | --- |
| `2.0.0-alpha.1` | `2000001` | `task/lcard-overlay-service-owned-launcher-trampoline-v001` / #173 | G2 version reset. Service-owned listener, `LauncherStartActivity` HOME return, separate `DiagnosticsActivity`, broker-gated dynamic Hails (PR #171). Arcade validation target. |

## Legacy POC line (superseded)

Historical builds before G2 reset. Retained for audit only — do not install over G2 without explicit downgrade intent.

| versionName | versionCode | Notes |
| --- | --- | --- |
| `1.0.0-v001` | 1 | Initial POC |
| … | … | Broker gate, animation contract iterations |
| `1.0.8-v001` | 13 | Service-owned launcher trampoline (pre-HOME-return) |
| `1.0.9-v001` | 14 | HOME return + launcher manifest attrs |

## Install reference (Arcade)

```bash
adb connect 192.168.68.105:5555
adb install -r hail-overlay-poc/app/build/outputs/apk/debug/app-debug.apk
adb shell appops set com.controlalt.hailoverlay SYSTEM_ALERT_WINDOW allow
curl -sS http://192.168.68.105:8765/health
```

Expected health after G2 alpha.1:

```json
{"status":"ok","port":8765,"app":"control-alt-hails","version":"2.0.0-alpha.1"}
```

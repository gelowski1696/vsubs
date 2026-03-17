# APK Update Guide (V-SUBS)

This guide is for publishing a new Android APK update for `com.vmjamtech.vsubs`.

## Fast Path (Recommended)

Use the automation script:

```bash
npm run -w mobile release:prepare -- --app-version 1.0.1 --bundle-version web-1.0.1 --version-code 2
```

What it does:
- updates `mobile/package.json` version
- updates `mobile/src/app/core/config/app-info.ts` (`version`, `bundleVersion`)
- updates Android `versionCode` and `versionName` in `mobile/android/app/build.gradle`
- builds web assets
- syncs Capacitor Android
- builds signed release APK
- creates OTA zip from `mobile/dist/mobile`
- creates release manifest JSON with sha256 + sizes in `mobile/release/`

Output files (example):
- `mobile/release/vsubs-v1.0.1-2.apk`
- `mobile/release/ota-web-1.0.1.zip`
- `mobile/release/release-web-1.0.1.json`

Dry run only (no file writes/build):

```bash
npm run -w mobile release:prepare:dry-run -- --app-version 1.0.1 --bundle-version web-1.0.1 --version-code 2
```

Optional flags:
- `--skip-apk` (prepare OTA only)
- `--skip-ota` (prepare APK only)
- `--skip-sync`
- `--skip-build`
- `--channel stable`

## 1) Update App Version

Edit `mobile/android/app/build.gradle`:

```gradle
defaultConfig {
    // increase for every release
    versionCode 2
    // user-visible version
    versionName "1.0.1"
}
```

Rules:
- `versionCode` must always increase.
- `versionName` is your display version.

## 2) Prepare Signing Values

Release signing is required by your Gradle config.

Use either:
- environment variables (`V_SUBS_KEYSTORE_FILE`, `V_SUBS_KEYSTORE_PASSWORD`, `V_SUBS_KEY_ALIAS`, `V_SUBS_KEY_PASSWORD`)
- or `mobile/android/keystore.properties`

Example `mobile/android/keystore.properties`:

```properties
V_SUBS_KEYSTORE_FILE=vsubs-release.jks
V_SUBS_KEYSTORE_PASSWORD=your_store_password
V_SUBS_KEY_ALIAS=vsubs
V_SUBS_KEY_PASSWORD=your_key_password
```

## 3) Build New APK

From repo root:

```bash
npm run -w mobile build
npm run -w mobile cap:sync
```

Build signed release APK:

- Windows:
```bash
npm run -w mobile android:release
```

- Linux/macOS:
```bash
npm run -w mobile android:release:linux
```

Output:
- `mobile/android/app/build/outputs/apk/release/app-release.apk`

## 4) Install/Test Before Upload

```bash
adb install -r mobile/android/app/build/outputs/apk/release/app-release.apk
```

Verify:
- login works
- Dashboard/Customers/Plans/Subscriptions load
- backend URL points to VPS (`http://<VPS_IP>:3003`)

## 5) Upload/Distribute the APK

Choose one:
- Internal sharing: send `app-release.apk` directly.
- Play Console: upload as a new release (recommended for production users).

## 6) Optional: OTA Bundle Update (No APK Reinstall)

Use OTA only for web-layer changes (UI/logic), not native/plugin changes.

High-level flow:
1. Build web assets: `npm run -w mobile build`
2. Zip `mobile/dist/mobile`
3. Create release metadata (`/v1/mobile-updates/releases`)
4. Upload zip (`/v1/mobile-updates/releases/{id}/upload`)
5. Publish (`/v1/mobile-updates/releases/{id}/publish`)

If native config/plugins changed, release a new APK instead.

## 7) Auto Upload Script (Login + Create + Upload + Publish)

You can automate OTA publishing with one command.

Environment variables (recommended):

- PowerShell:
```powershell
$env:VSUBS_ADMIN_EMAIL="admin@vmjam.com"
$env:VSUBS_ADMIN_PASSWORD="Admin123!"
```

- Bash:
```bash
export VSUBS_ADMIN_EMAIL="admin@vmjam.com"
export VSUBS_ADMIN_PASSWORD="Admin123!"
```

Run publish:

```bash
npm run -w mobile ota:publish -- \
  --base-url http://<VPS_IP>:3003/v1 \
  --client-id subman-mobile \
  --manifest mobile/release/release-web-1.0.1.json \
  --release-notes "Bug fixes and UI improvements"
```

What this does automatically:
1. Login via `/v1/auth/login`
2. Get access token
3. Create OTA release metadata
4. Upload bundle zip
5. Publish release

Draft mode (upload but do not publish):

```bash
npm run -w mobile ota:publish -- \
  --base-url http://<VPS_IP>:3003/v1 \
  --client-id subman-mobile \
  --manifest mobile/release/release-web-1.0.1.json \
  --draft
```

npm run -w mobile release:prepare -- --app-version 1.0.1 --bundle-version web-1.0.1 --version-code 2

npm run -w mobile ota:publish -- \
  --base-url http://<VPS_IP>:3003/v1 \
  --client-id subman-mobile \
  --manifest mobile/release/release-web-1.0.1.json \
  --release-notes "Bug fixes and UI improvements"


npm run -w mobile ota:publish -- \
  --base-url http://<VPS_IP>:3003/v1 \
  --client-id subman-mobile \
  --manifest mobile/release/release-web-1.0.1.json \
  --draft

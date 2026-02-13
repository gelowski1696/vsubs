# Mobile

Stack: Ionic Angular + TailwindCSS + Capacitor.

## Features
- Login/logout + guarded routes
- Dashboard KPIs
- Customers, Plans, Subscriptions screens
- Ending soon indicator (<= 7 days)
- Offline cache using Ionic Storage
- Pull-to-refresh sync
- Theme modes: Light, Dark, System with persistence
- OTA software updates (check on startup + manual check in Settings)

## OTA Setup
1. Install native updater plugin (already added in this build):
```bash
npm install -w mobile @capgo/capacitor-updater@6.42.9
```
2. Sync native project:
```bash
npm run -w mobile cap:sync
```
3. Publish OTA release from backend admin endpoints:
- create release metadata
- upload zip bundle from `mobile/dist/mobile`
- publish release

Settings page now includes:
- current app and bundle versions
- check for updates
- apply update when available

## Android APK
1. Build web assets:
```bash
npm run -w mobile build
```
2. Sync Capacitor:
```bash
npm run -w mobile cap:sync
```
3. Open Android Studio:
```bash
npm run -w mobile android:open
```

## Signed Release APK (Install-ready)
1. Generate a keystore (run once):
```bash
keytool -genkeypair -v -keystore vsubs-release.jks -alias vsubs -keyalg RSA -keysize 2048 -validity 10000
```

2. Place keystore in `mobile/android/` and create `mobile/android/keystore.properties`:
```properties
V_SUBS_KEYSTORE_FILE=vsubs-release.jks
V_SUBS_KEYSTORE_PASSWORD=your_store_password
V_SUBS_KEY_ALIAS=vsubs
V_SUBS_KEY_PASSWORD=your_key_password
```

3. Build release APK:
- Windows:
```bash
npm run -w mobile android:release
```
- Linux/macOS:
```bash
npm run -w mobile android:release:linux
```

4. Output path:
- `mobile/android/app/build/outputs/apk/release/app-release.apk`

5. Install on device:
```bash
adb install -r mobile/android/app/build/outputs/apk/release/app-release.apk
```

6. Verify app-to-backend connectivity:
- set mobile API base URL to `http://<VPS_IP>:3003`
- login with seeded admin credentials
- open Dashboard/Customers to confirm API access

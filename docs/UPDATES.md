# V-SUBS Updates

## 2026-03-17 - APK/OTA Release Automation

### Summary
Added a one-command release preparation script for mobile APK and OTA packaging.

### Changes Made
1. Added script: `mobile/scripts/release-prep.mjs`
- Updates release versions across:
  - `mobile/package.json`
  - `mobile/src/app/core/config/app-info.ts`
  - `mobile/android/app/build.gradle`
- Can build web assets + Capacitor sync + signed APK.
- Creates OTA zip from `mobile/dist/mobile`.
- Generates release manifest with checksums and sizes in `mobile/release/`.

2. Added npm scripts:
- `npm run -w mobile release:prepare -- --app-version <x> --bundle-version <y> --version-code <n>`
- `npm run -w mobile release:prepare:dry-run -- --app-version <x> --bundle-version <y> --version-code <n>`

3. Updated release documentation:
- `docs/APK_UPDATE.md` now includes fast-path automated release flow and flags.

4. Added OTA auto-publish script:
- `mobile/scripts/ota-publish.mjs`
- Performs: admin login -> token -> create release -> upload bundle -> publish.
- New npm script:
  - `npm run -w mobile ota:publish -- ...`

## 2026-03-17 - Subscriptions + Mobile UI Stability

### Summary
This update resolves subscription management issues in mobile and hardens backend validation for subscription creation/deletion.

### Changes Made
1. Fixed tab overlap with page content/cards.
- Added bottom safe padding for tab-shell content so cards/lists are no longer hidden behind the fixed bottom nav.
- File: `mobile/src/global.scss`

2. Added subscription delete action with rule enforcement.
- Added `Delete` button in Subscription Management.
- Delete is blocked for `ACTIVE` and `PAUSED` subscriptions in UI.
- Files:
  - `mobile/src/app/features/subscriptions/subscriptions.page.html`
  - `mobile/src/app/features/subscriptions/subscriptions.page.ts`
  - `mobile/src/app/core/api/subman-api.service.ts`

3. Enforced delete restriction in backend.
- Backend now rejects deletion for `ACTIVE` and `PAUSED` subscriptions.
- Error returned: `Cannot delete ACTIVE or PAUSED subscriptions`.
- File: `backend/src/subscriptions/subscriptions.service.ts`

4. Fixed subscription create 500 errors.
- Added stronger validation on create for customer/plan references.
- Foreign key issues now return `400 Bad Request` with:
  - `Invalid customer or plan reference`
- File: `backend/src/subscriptions/subscriptions.service.ts`

### Verification
- Backend build: `npm run -w backend build`
- Mobile build: `npm run -w mobile build`
- Commit: `b01a6ce`

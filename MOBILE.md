# Opal Android (Capacitor) + Offline Sync

## What you get

- **Offline-first local store** (Dexie / IndexedDB) for accounts, transactions, categories, budgets, goals, investments, loans, recurring, user settings, AI preferences/memories, and notification preferences.
- **Outbox + sync engine** that pushes to `POST /api/sync/push` and pulls from `GET /api/sync/pull` when online.
- **Conflict UI** (Keep local / Keep remote) in the top bar sync menu and **Settings → Offline & Sync**.
- **Capacitor Android** project under `expense-frontend/android`.

## Backend setup

1. Apply migrations (includes sync tables / `sync_version`):

```bash
cd expense-backend
npm run migration:up
```

2. Start API as usual (`npm run start:dev`). Sync routes:

- `GET /api/sync/status`
- `POST /api/sync/push`
- `GET /api/sync/pull?since=&device_id=`

## Web offline usage

1. Sign in while online once (seeds local DB via list/pull).
2. Turn off network — create/edit data; it queues in the outbox.
3. Reconnect — sync indicator runs push/pull automatically (also every 60s).

## Android build

### Prerequisites

- Android Studio (SDK + emulator or device)
- JDK 21 (or Studio-bundled JDK)
- Node.js 20+

### Point the app at your live API

Mobile builds **must not** use `localhost`. `npm run build:mobile` now bakes in:

`https://expense-backend-2tg0.onrender.com/api`

On Render, set `CLIENT_HOST` to include your web origin (Capacitor origins are also allowed in code):

```text
https://expense-frontend-theta-two.vercel.app,https://localhost,capacitor://localhost,http://localhost
```

Mobile builds enable **CapacitorHttp** so API calls use native networking (avoids WebView CORS). Rebuild the APK after pulling these changes (`npm run mobile:android`).

After installing the APK: if login still fails, open **Settings → Offline & Sync → Use Render production → Save & test connection**, then **Sync now**.

### Build & open

```bash
cd expense-frontend
npm install
npm run mobile:android   # build:mobile (static export -> out/) + cap sync android
npm run cap:open
```

In Android Studio: Run on emulator/device.

Android Studio only packages what is already in `android/app/src/main/assets/public`.
After **any** web change, run `npm run mobile:android` (or `npm run build:mobile`
followed by `npm run cap:sync`) **before** pressing Run / Build in Android Studio,
otherwise the APK ships the previous web build.

### Live updates (no APK rebuild for web changes)

Every push to `main` runs `.github/workflows/mobile-ota.yml`, which builds the
static export, zips it and publishes it with a `latest.json` manifest on the
rolling `ota` GitHub release. Installed apps (`src/lib/native/live-update.ts`,
via `@capgo/capacitor-updater` in self-hosted mode) check that manifest on
launch and on resume, download newer bundles in the background, and switch to
them the next time the app is backgrounded or restarted. A bundle that fails to
start is rolled back automatically and not retried.

Pages, components, styles and JS-only npm packages ship this way. **Build and
distribute a new APK** when you add/upgrade a Capacitor plugin, change
`android/` or `capacitor.config.ts`, or change the icon/name — and **bump
`versionCode`** in `android/app/build.gradle` in the same commit. The manifest
carries that `versionCode` as `minNativeBuild`, so older APKs keep their current
bundle instead of receiving code that needs native pieces they don't have.

To publish a bundle without pushing, run the workflow manually from the
GitHub Actions tab.

### Release signing

Release builds are signed only when `android/keystore.properties` exists
(it, `*.jks` and `*.keystore` are gitignored — never commit them):

```properties
# android/keystore.properties
storeFile=release.jks          # path relative to android/
storePassword=********
keyAlias=opal
keyPassword=********
```

Create a keystore once (keep it and its passwords safe; losing it means you can
no longer update the Play Store listing):

```bash
keytool -genkeypair -v -keystore android/release.jks -alias opal -keyalg RSA -keysize 2048 -validity 10000
```

Then `cd android && ./gradlew assembleRelease` (or `bundleRelease`). Without
`keystore.properties` the release variant still builds, just unsigned.

### Scripts

| Script | Purpose |
|--------|---------|
| `npm run build:mobile` | Next.js static export (`MOBILE=1`) → `out/` |
| `npm run cap:sync` | Copy web assets into Android project |
| `npm run cap:open` | Open Android Studio |
| `npm run mobile:android` | Export + sync |

### Cleartext / local API (debug only)

Release builds are HTTPS-only: `android/app/src/main/res/xml/network_security_config.xml`
disallows cleartext and the manifest no longer sets `usesCleartextTraffic`.

Debug builds use `android/app/src/debug/res/xml/network_security_config.xml`,
which allows cleartext **only** to `10.0.2.2` (emulator → host machine),
`localhost` and `127.0.0.1`. To test a physical device against a LAN IP, add
that IP to the debug file (don't add it to `main`).

To point a debug build at a local backend:

1. Build with the emulator URL baked in, e.g.
   `npx cross-env MOBILE=1 NEXT_PUBLIC_API_BASE_URL=http://10.0.2.2:9000/api next build`,
   then `npx cross-env CAP_DEV=1 npx cap sync android` (`CAP_DEV=1` also turns on
   Capacitor's `server.cleartext` / `android.allowMixedContent`, which stay off
   in normal syncs), **or**
2. In an existing debug install open **Settings → Offline & Sync**, set the API
   base URL to `http://10.0.2.2:9000/api`, then **Save & test connection**.
   (Loopback URLs such as `localhost` are cleared automatically on device.)

Run a plain `npm run mobile:android` again before making a release build so the
production config is synced.

### Routes in the static export

Capacitor serves the root `index.html` for any path without a file extension,
and the static export cannot pre-render arbitrary IDs. So:

- Pages that need an ID use query params on a single static page:
  `/spaces/view?id=<spaceId>`, `/spaces/invites/accept?token=<token>`,
  `/expenses/edit?id=<transactionId>`. The old `/spaces/<id>`,
  `/spaces/invites/<token>` and `/expenses/<id>` URLs still work on the web only.
- When the app starts or reloads on a non-root path, the root page forwards to
  that route client-side (with a short loop guard), so reloads keep the current
  page instead of jumping to the dashboard.

## Smoke test checklist

1. Web: create a transaction offline → reconnect → appears on server / second browser after pull.
2. Edit the same transaction on two clients → conflict appears → Keep local / Keep remote resolves.
3. Android emulator (debug build): sign in against `http://10.0.2.2:9000/api`, create an account offline (airplane mode), go online, confirm sync indicator clears pending count.

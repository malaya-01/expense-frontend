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

On Render, set `CLIENT_HOST` to include Capacitor origins:

```text
https://expense-frontend-theta-two.vercel.app,https://localhost,capacitor://localhost,http://localhost
```

After installing the APK: **Settings → Offline & Sync → Use Render production → Save & test connection**, then **Sync now**.

### Build & open

```bash
cd expense-frontend
npm install
npm run mobile:android
npm run cap:open
```

In Android Studio: Run on emulator/device.

### Scripts

| Script | Purpose |
|--------|---------|
| `npm run build:mobile` | Next.js static export (`MOBILE=1`) → `out/` |
| `npm run cap:sync` | Copy web assets into Android project |
| `npm run cap:open` | Open Android Studio |
| `npm run mobile:android` | Export + sync |

### Cleartext / LAN API

Debug builds allow cleartext HTTP via `network_security_config.xml` and `usesCleartextTraffic`. Production should use HTTPS.

### Dynamic routes note

Static export includes placeholder params for `/expenses/[id]`, `/spaces/[spaceId]`, and invite tokens. Prefer in-app navigation from lists. Deep-linking arbitrary IDs into a cold start may miss a static HTML file — open the app then navigate.

## Smoke test checklist

1. Web: create a transaction offline → reconnect → appears on server / second browser after pull.
2. Edit the same transaction on two clients → conflict appears → Keep local / Keep remote resolves.
3. Android emulator: sign in against `http://10.0.2.2:9000/api`, create an account offline (airplane mode), go online, confirm sync indicator clears pending count.

# Noted.

Sticky notes and a simple kanban, side by side. Noted is **offline-first**: everything you write is saved on your device instantly and works without a network or an account. Sign up when you want a cloud backup and your notes on every device: web, macOS and Windows.

- 🗒️ Freeform sticky-note board (drag anywhere, front/back, or snap to a grid), Markdown with tickable checklists, tags, colours
- ✅ Four-column kanban (Backlog → To do → Doing → Done) with drag and drop
- 🔎 Instant local search, tag filters and keyboard shortcuts (`N`, `T`, `/`, `1–4`, `D`, `?`)
- 📴 Works fully offline: IndexedDB for data, a service worker for the web app shell
- ☁️ Optional account. Local changes sync automatically in the background once you log in
- 🖥️ Desktop app for macOS and Windows (Electron) that shares the same UI and sync engine

## Monorepo layout

```
apps/
  web/        Next.js 16 app: landing page, web app, service worker
  api/        Fastify 5 + MongoDB (Mongoose) REST API: auth + sync
  desktop/    Electron 44 app (Vite renderer), packaged with electron-builder
packages/
  shared/     Zod schemas and types shared by clients and the API
  core/       Client data layer: IndexedDB (Dexie), repositories, API client, sync engine
  ui/         React screens and components used by both web and desktop
  tsconfig/   Shared TypeScript configs
```

Tooling: pnpm workspaces, Turborepo, TypeScript 6, Biome (lint + format), Vitest.

```
            ┌──────────── packages/ui (React) ────────────┐
            │  NotedApp · AuthScreen · ProfileScreen       │
            └───────────────┬──────────────────────────────┘
                            │ uses
            ┌───────────────▼──────────────────────────────┐
            │ packages/core                                 │
            │  IndexedDB (Dexie) ← repos ← UI writes        │
            │  SyncManager ── syncOnce() ── API client ─────┼──► apps/api ──► MongoDB
            └───────▲───────────────────────▲───────────────┘      (Fastify)
                    │                       │
     apps/web (Next.js + service worker)   apps/desktop (Electron, app:// protocol)
```

## Getting started

**Prerequisites:** Node.js ≥ 22.18 (24 LTS recommended), pnpm 11 (`corepack enable`), and MongoDB (Docker is easiest).

```bash
pnpm install
pnpm db:up                                   # MongoDB 8 via docker compose

cp apps/api/.env.example apps/api/.env       # set JWT_SECRET (32+ chars)
cp apps/web/.env.example apps/web/.env.local
cp apps/desktop/.env.example apps/desktop/.env

pnpm dev             # everything: API on :4000, web on :3000, Electron (Vite renderer on :5173)
```

To work on one app at a time, run the API alongside it in a second terminal:

```bash
pnpm dev:api         # API on :4000
pnpm dev:web         # web on :3000
pnpm dev:desktop     # Electron with a hot-reloading renderer (Vite on :5173)
```

Open http://localhost:3000 for the landing page, or http://localhost:3000/app to jump straight into the app. No account needed.

> Service workers are disabled in `next dev` to avoid caching dev bundles. To try offline mode, run a production build (`pnpm --filter @noted/web build && pnpm --filter @noted/web start`) or set `NEXT_PUBLIC_ENABLE_SW_IN_DEV=true`.

### Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | API, web and Electron together in watch mode |
| `pnpm dev:api` | API only (`tsx watch`) |
| `pnpm dev:web` | Web only (Next.js dev server). Needs the API running for login and sync |
| `pnpm dev:desktop` | Electron only. Needs the API running for login and sync |
| `pnpm build` | Builds every app (web, API bundle, desktop `dist/`) |
| `pnpm typecheck` | Type-checks every workspace, including the service worker |
| `pnpm test` | Vitest: sync engine tests (core) and API integration tests (in-memory MongoDB) |
| `pnpm lint` / `pnpm format` | Biome check / check and fix |
| `pnpm --filter @noted/desktop dist:mac` | Builds `.dmg` and `.zip` (arm64 + x64) into `apps/desktop/release` |
| `pnpm --filter @noted/desktop dist:win` | Builds an NSIS installer (x64 + arm64) |

### Environment variables

| App | Variable | Purpose |
| --- | --- | --- |
| api | `MONGODB_URI` | Mongo connection string |
| api | `JWT_SECRET` | Signs access tokens (≥ 32 chars) |
| api | `CORS_ORIGINS` | Comma-separated allowed origins. Include `app://noted` for the desktop app |
| api | `PORT`, `HOST` | Listen address (default `0.0.0.0:4000`) |
| web | `NEXT_PUBLIC_API_URL` | API base URL, also baked into the service worker for background sync |
| web | `NEXT_PUBLIC_DOWNLOAD_URL_MAC` / `_WINDOWS` | Download buttons on the landing page |
| desktop | `VITE_API_URL` | API base URL, also added to the renderer's CSP `connect-src` |
| desktop | `VITE_WEBSITE_URL` | Opened when the desktop app links to the website |

## How offline-first works

### Local-first data (web and desktop)

All reads and writes go to **IndexedDB** through Dexie (`packages/core`). The UI subscribes with `useLiveQuery`, so every change re-renders instantly and propagates across tabs. Each record carries:

- `id`: a client-generated UUID, so records can be created offline
- `updatedAt`: a per-record monotonic timestamp
- `deletedAt`: a soft-delete tombstone, so deletions sync too
- `dirty`: set to `1` when the record has local changes not yet in the cloud

A first run seeds a few welcome notes, so the app is useful before any network or account.

### Local vs. cloud indicator

The sidebar (and a pill in the mobile header) always shows where your data lives:

| State | Shown as |
| --- | --- |
| Guest | **Saved on this device** · *Back up* → sign up |
| Signed in, idle | **Synced 2 min ago** |
| Uploading | **Syncing…** |
| Offline | **Offline** · *N changes will sync when you reconnect* |
| Error | **Sync paused** · *Retry* |

Guests also see a dismissible banner above the composer ("Your notes only live on this device…") prompting them to sign up or log in. On the auth screen, the app tells guests how many local items will be added to their account.

### Sync protocol

`POST /sync { cursor, notes[], tasks[] }` → `{ cursor, hasMore, notes[], tasks[] }`

1. The client pushes up to 500 dirty records per collection.
2. The server applies each one with an atomic **last-write-wins** upsert (`updatedAt` must be newer), and gives accepted writes a per-user, monotonically increasing `seq`.
3. The server returns every record with `seq > cursor`, and the client stores the new cursor.
4. The client marks pushed records clean only if they weren't edited again while the request was in flight, and applies pulled records that are at least as new as the local copy.

Sync runs through a Web Lock (`navigator.locks`), so tabs and the service worker never sync at the same time. It is triggered:
- after local edits (debounced)
- on the `online` event
- when the tab becomes visible
- every 60 seconds
- by a Background Sync event from the service worker

### Service worker (web)

`apps/web/src/sw/sw.ts` is bundled by esbuild into `public/sw.js` before every `next dev` or `next build`, with a unique build ID.

- **Install** precaches the app shell (`/`, `/app`, `/login`, `/signup`, `/profile`, `/offline`). It also scrapes each page's HTML (and CSS) for hashed `/_next/static/*` assets and caches them, so the very first visit, even to the landing page, makes the whole app work offline.
- **Fetch:**
  - `/_next/static/*` is cache-first (the files are immutable and hashed).
  - Page navigations are network-first with a 3-second timeout. They fall back to the cached page, then to the matching app shell, then to `/offline`.
  - Other same-origin GETs (icons, manifest) are stale-while-revalidate.
  - API calls and RSC requests pass straight through. The data layer lives in IndexedDB, not the HTTP cache.
- **Background Sync:** if a sync is attempted while offline, the page registers the `noted-sync` tag. When connectivity returns, Chromium browsers wake the service worker, which runs the same `syncOnce()` from `@noted/core`, even if every tab is closed.
- **Updates:** a new worker waits instead of taking over. The page shows "A new version of Noted is ready · Reload", which sends `SKIP_WAITING` and reloads once the new worker is in control. Old caches are deleted on activate.

### Desktop

The Electron app loads the renderer from a privileged custom protocol, `app://noted`. That gives it a stable, secure origin, so IndexedDB persists and CORS works. It uses the same `@noted/ui` and `@noted/core`, so offline behaviour and sync match the web exactly. Assets ship inside the app, so no service worker is needed.

Security defaults:
- `contextIsolation`, `sandbox`, and no Node in the renderer
- a strict CSP
- external links open in the default browser
- a single-instance lock

## API

| Method | Route | Notes |
| --- | --- | --- |
| `POST` | `/auth/signup`, `/auth/login` | Returns user + access token (JWT, 15 min) + refresh token (30 days) |
| `POST` | `/auth/refresh` | Rotates the refresh token (the old one stops working) |
| `POST` | `/auth/logout` | Revokes this device's session |
| `GET` / `PATCH` / `DELETE` | `/me` | Profile, update name/email/avatar, delete account and all data |
| `POST` | `/me/password` | Changes password and signs out other devices |
| `GET` / `DELETE` | `/me/sessions[/:id]` | Lists devices / signs one out |
| `POST` | `/sync` | See above |

Passwords are hashed with Argon2id. Refresh tokens are stored only as SHA-256 hashes, and every authenticated request checks that its session still exists, so signing a device out takes effect immediately. Auth routes are rate-limited.

## Deployment notes

- **Web:** any Next.js host (e.g. Vercel). Every page is statically prerendered.
- **API:** `pnpm --filter @noted/api build` produces a single `dist/index.mjs`. Run it with `node` next to a MongoDB (Atlas or self-hosted).
- **API on Vercel:** framework preset **Fastify**, root directory `apps/api`, install command `pnpm install --frozen-lockfile --filter @noted/api...`, and keep "Include files outside the root directory" enabled. Set `MONGODB_URI`, `JWT_SECRET`, `CORS_ORIGINS` and `ENABLE_EXPERIMENTAL_COREPACK=1`.
  - Vercel compiles each file separately and runs it as native Node ESM. That's why API imports use explicit `.js` extensions (enforced by `NodeNext` in `apps/api/tsconfig.json`).
  - It's also why `@noted/shared` is built to `dist/` by its `prepare` script on every `pnpm install`.
- **Desktop:** `electron-builder.yml` publishes to GitHub Releases. For distribution, add Apple notarization credentials and a Windows code-signing certificate.

## Not included yet

- Password reset by email (needs a mail provider) and Google/Apple sign-in
- Field-level merge. Sync is last-write-wins per note/task, so the same note edited on two devices keeps the newest edit.

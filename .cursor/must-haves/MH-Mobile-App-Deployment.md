# MH — Mobile app deployment must-haves

**Teacher's Dilemma Today (TDTD)** — checklist for shipping installable iOS/Android apps (Play Store / App Store) from this monorepo.

**Status:** Must-haves · **Last updated:** 2026-06-04

**Related docs:**

- [Mobile-App-Version-Plan.md](../documentation/Mobile-App-Version-Plan.md) — full phased plan
- [Authentication-Function.md](../documentation/Authentication-Function.md) — auth v1 (server + web)
- [TDTD-Batch-Function.md](../documentation/TDTD-Batch-Function.md) — server reminders / batch deploy
- [Ngrok-Demo.md](../documentation/Ngrok-Demo.md) — local demo only (not production)
- `tdtd-frontend/README.md` — Capacitor build commands

---

## Summary

| Layer | Verdict |
|-------|---------|
| **Repo architecture** (`tdtd-frontend` + Capacitor + `tdtd-node` + `tdtd-batch`) | Suitable — keep this shape |
| **Play Store / App Store — online-only v1** | Not ready until hosting, mobile build config, durable auth storage, security, and store/compliance items below |
| **Play Store — full offline mobile (product vision)** | Not ready — additionally requires device SQLite, real sync, and mobile UX in sections 4–6 |

Use **Section A** for the minimum bar to publish an installable app that talks to a hosted API. Use **Sections B–G** for the planned offline-first mobile product and long-term operations.

---

## Already in place (do not redo)

- [x] Capacitor shell in `tdtd-frontend` (`capacitor.config.ts`, `android/`, `ios/`, `appId: com.tdtd.teacher`)
- [x] Mobile build flavor: `VITE_APP_TARGET=mobile`, `npm run build:mobile`, `cap:sync`
- [x] Mobile-only code gated via `src/mobile/appTarget.ts` (`isOfflineCapable()`, `isMobileApp()`)
- [x] Sync route scaffold on server: `GET /api/sync/pull`, `POST /api/sync/push` (auth-required)
- [x] Client sync scaffold: `src/mobile/sync/` (outbox, `syncClient.ts`)
- [x] JWT auth on `tdtd-node` — signup/login/refresh; `authenticate` on protected `/api/*`
- [x] Health check: `GET /api/health`

---

## A. Minimum for Play Store — online-only v1

Ship Capacitor wrapping the React UI; all data via REST to a **public HTTPS API**. No offline local DB required for this tier.

### A1. Hosting and API

- [ ] Deploy `tdtd-node` to a **HTTPS** host (VPS, Railway, Fly.io, school server, etc.)
- [ ] **Persistent volume** for SQLite (`TDTD_DB_PATH` / `data/teacher_app.sqlite`) — not ephemeral container disk
- [ ] **Automated backups** of `teacher_app.sqlite` (schedule + restore tested)
- [ ] Document environment matrix: `dev` (LAN), `staging`, `production`
- [ ] Production secrets: JWT signing keys, DB path, `PORT` — not committed to git
- [ ] Deploy **`tdtd-batch`** (or equivalent cron) if server-driven AM/PM reminders are required in production
- [ ] Confirm batch and API share the same DB file path on the host (see [TDTD-Batch-Function.md](../documentation/TDTD-Batch-Function.md))

Note: `tdtd-node` does **not** serve the SPA today. That is OK for Capacitor (UI is bundled in the APK/IPA). The web app can be hosted separately (CDN/static) if needed.

### A2. Mobile build configuration

- [ ] Production mobile builds use:
  - `VITE_APP_TARGET=mobile`
  - `VITE_API_URL=https://<your-production-api>` (no trailing slash; **not** `http://127.0.0.1:3000`)
- [ ] Document the release build command pipeline, e.g. `npm run build:mobile` → `npx cap sync` → Android Studio / Xcode release build
- [ ] Verify API reachability from a physical device (not emulator-only)

### A3. Mobile auth storage (critical)

Server auth exists; **web storage is not sufficient for native apps.**

- [ ] Replace `sessionStorage` token storage in `src/lib/authStorage.ts` for Capacitor with **durable secure storage** (e.g. Capacitor Preferences + platform keystore, or a dedicated secure-storage plugin)
- [ ] Tokens survive app kill / device reboot
- [ ] Logout still clears server refresh token and local secrets
- [ ] Do not store refresh tokens in plain `localStorage` on mobile

### A4. API security (public internet)

- [ ] Replace `cors({ origin: true })` in `tdtd-node` with an **allowlist** of known origins (web app URL(s); Capacitor may use `capacitor://` / `https://localhost` — verify and document)
- [ ] **IDOR review**: every class/student/attendance/score route scoped to the authenticated teacher (no cross-user access by ID guessing) — requires GAP-001 schema + GAP-002 route audit; see [GAP-001.md](../gaps/GAP-001.md)
- [ ] Rate-limit login (and optionally signup) — called out as not in auth v1
- [ ] Strong `JWT` / refresh secret configuration in production (rotate procedure documented)
- [ ] TLS only for API; no cleartext production endpoints

### A5. Play Console / App Store compliance

- [ ] **Privacy policy** URL (student PII — names, attendance, scores)
- [ ] Google Play **Data safety** form completed accurately
- [ ] Apple **App Privacy** labels (if shipping iOS)
- [ ] Store listing copy: clarify **online vs offline** so listing matches actual v1 behavior
- [ ] Screenshots, icon, feature graphic / promotional assets
- [ ] Target audience / content rating appropriate for an education tool
- [ ] Notification copy policy if notifications ship: avoid student names in notification body where possible (see [Mobile-App-Version-Plan.md](../documentation/Mobile-App-Version-Plan.md))

### A6. Android release engineering

- [ ] **Release signing** keystore (not debug) configured in Android Studio / CI
- [ ] **AAB** (Android App Bundle) build for Play Console upload
- [ ] `versionCode` / `versionName` bump process documented (`android/app/build.gradle`)
- [ ] Review `android:allowBackup` in `AndroidManifest.xml` vs student PII policy (encrypt or restrict backup if required)
- [ ] `INTERNET` permission is present (already required for API calls)

### A7. iOS release engineering (if shipping App Store)

- [ ] Apple Developer account, bundle ID `com.tdtd.teacher`, provisioning profiles
- [ ] Archive / upload via Xcode or CI
- [ ] TestFlight internal testing before public release

### A8. CI / release pipeline

- [ ] CI job: `npm run build:mobile` (in addition to web `npm run build`)
- [ ] Optional: automated `cap sync` + signed AAB/IPA on release tags
- [ ] `tdtd-node` deploy pipeline separate from frontend (tests + migrate on deploy)

### A9. Web vs mobile messaging

- [ ] Web build stays **online-only** — no device SQLite paths
- [ ] In-app copy on web (e.g. Home / settings): “Install the mobile app for offline use” once offline ships; for online-only v1, do not claim offline in store listing

### A10. Operational readiness

- [ ] Monitoring / alerts on `GET /api/health` and disk space for DB volume
- [ ] Incident runbook: restore DB backup, rotate JWT secrets, disable compromised accounts
- [ ] Support contact or feedback channel for store listing

---

## B. Product and security decisions (before heavy offline work)

Complete or document decisions — see Phase 0 in [Mobile-App-Version-Plan.md](../documentation/Mobile-App-Version-Plan.md).

- [ ] **Offline scope (MVP):** which actions work offline (suggested: read classes/students, AM/PM attendance, view recent scores; defer bulk import / school-year registration)
- [ ] **Single-teacher vs multi-teacher** per device and sync identity
- [ ] **Server role:** sync home base vs device-only + export
- [ ] **Conflict policy:** last-write-wins, server wins, etc. — document in [sync.md](../schemas/sync.md)
- [ ] **Data at rest:** encrypt local SQLite on mobile if storing student PII (OS keystore / SQLCipher)
- [ ] **Notification policy:** v1 reminders (AM/PM nudge + sync status only); opt-in defaults
- [ ] **GDPR / delete:** export and wipe local + server data — process defined

---

## C. Offline mobile — local database (mobile only)

- [ ] Add Capacitor SQLite plugin (e.g. `@capacitor-community/sqlite`)
- [ ] Wire `src/mobile/db/connection.ts` — run `getMobileLocalDbMigrationSql()` on device
- [ ] Repository layer: mobile `*Repository.ts` → local DB; web `*Api.ts` → HTTP only
- [ ] Guard all local DB access with `isOfflineCapable()` / `isMobileApp()`
- [ ] Initial sync on first login: full pull from server
- [ ] Optional: “start offline, sync later” first-run flow
- [ ] Regression test: **web build never opens device SQLite**

---

## D. Offline mobile — sync (server + client)

Server scaffold exists; **row-level fan-out is not implemented.**

- [ ] Server `pullSync`: return real changes since cursor (`updatedAt` / change log / tombstones)
- [ ] Server `pushSync`: apply mutations idempotently; reject or merge conflicts per policy
- [ ] Per-user / per-device sync state fully enforced (building on `sync.dao`)
- [ ] Client: apply pull to local DB; drain outbox on push with retry/backoff
- [ ] UI: connection status (“Offline — saved on device”, “Syncing…”, “Up to date”)
- [ ] Manual **Sync now** in mobile settings
- [ ] Document sync contract in [sync.md](../schemas/sync.md)

---

## E. Mobile shell and UX

- [ ] Status bar, safe areas, Android **back button** + React Router
- [ ] **Deep links:** e.g. `/attendance/session/:date?period=AM`, `/scores/event/:id`, settings
- [ ] Mobile **settings** screen: sync status, last synced, storage size, Sync now, Clear local data
- [ ] Excel import (`xlsx`): mobile file picker UX; consider online-only or queued import
- [ ] Phone layout QA: Scores, Classes two-column collapse on small screens
- [ ] Hide offline-only messaging on web builds

---

## F. Notifications (mobile v1+)

- [ ] `@capacitor/local-notifications` (or equivalent) for AM/PM attendance reminders
- [ ] Permission request on **first enable in Settings**, not cold start
- [ ] Notification tap → deep link to attendance / today’s session
- [ ] In-app sync banner when outbox pending; optional local notification on sync failure
- [ ] Web: in-app banners first; Web Push only after hosting + explicit opt-in (not v1 mobile blocker)

---

## G. Quality, security review, and launch

- [ ] Test matrix: iOS + Android; offline → online → offline; airplane mode during attendance save
- [ ] Pen-test checklist: auth bypass, IDOR, sync replay / duplicate push
- [ ] No student PII in logs or crash reports without scrubbing
- [ ] Store assets finalized; internal testing track (Play internal / TestFlight) before production
- [ ] Post-launch: version bump + release notes process

---

## Quick reference — build commands

```bash
# API (host separately in production)
cd tdtd-node && npm run build && npm start

# Mobile artifact (set VITE_API_URL for production in .env.production or CI env)
cd tdtd-frontend
# VITE_APP_TARGET=mobile
# VITE_API_URL=https://api.yourdomain.com
npm run cap:sync
npx cap open android   # or ios on macOS
```

---

## Open questions (record decisions here)

| # | Question | Decision |
|---|----------|----------|
| 1 | Ship **online-only** v1 to Play Store first, or wait for offline + sync? | |
| 2 | Hosting provider for `tdtd-node` + DB volume? | |
| 3 | Production API URL (baked into `VITE_API_URL`)? | |
| 4 | Encrypt local SQLite in v1 or v2? | |
| 5 | iOS in scope for v1 or Android-only first? | |

---

## Architecture reminder

```text
WEB (unchanged):     Browser → REST → Server SQLite (online only)

MOBILE (target):     App UI → Local SQLite → (when online) Sync ↔ Server SQLite

MOBILE (online v1):  App UI → REST → Server SQLite (no local DB yet)
```

The monorepo layout does **not** need a separate `tdtd-mobile/` root; Capacitor lives in `tdtd-frontend`.

# Mobile app version — plan and checklist

**Teacher's Dilemma Today (TDTD)** — path from the current React + `tdtd-node` + SQLite (server) web app to an **installable iOS/Android app** with **offline mode on mobile only** (not on browser/web).

**Status:** Planning · **Last updated:** 2026-05-26

**Related docs:** [README.md](./README.md) · [App-Shell-Function-Doc.md](./App-Shell-Function-Doc.md) · [`.cursor/schemas/README.md`](../schemas/README.md)

---

## Goals

| Goal | Notes |
|------|--------|
| Ship **native apps** (App Store / Play Store or sideloaded builds) | Wrap existing UI where possible (Capacitor + current Vite/React app). |
| **Offline on mobile only** | Web/browser build stays **online-only** (current REST → server SQLite). Mobile build embeds local storage + sync. |
| **Secure enough for real devices** | HTTPS, auth, encrypted storage where appropriate, no open API on the public internet. |
| **Same product features** | Attendance, classes/students, subjects, scores, recents — parity with web where it makes sense. |

---

## Architecture decision (locked for this plan)

### Web (unchanged philosophy)

- **Frontend:** `tdtd-frontend` → browser → `fetch` → `tdtd-node` `/api` → `teacher_app.sqlite` on server/host.
- **No offline writes** in browser. No local SQLite in web build.
- **No service-worker offline cache** for mutations (optional: cache static assets only).

### Mobile (new)

- **Shell:** Capacitor (recommended) wrapping the same React app **or** a dedicated mobile build flavor.
- **Local DB:** SQLite on device (e.g. `@capacitor-community/sqlite` or equivalent) with schema aligned to [`.cursor/schemas/`](../schemas/).
- **Sync layer:** Mobile talks to local DB first; background/sync service pushes/pulls to server when online.
- **Build-time or runtime flag:** e.g. `VITE_APP_TARGET=mobile` vs `web` — web code paths never open the local DB.

```text
WEB:     Browser → REST → Server SQLite

MOBILE:  App UI → Local SQLite → (when online) Sync ↔ Server SQLite
```

---

## Major gaps today (repo audit)

- [ ] No Capacitor / iOS / Android projects
- [ ] No local SQLite on client
- [ ] No sync protocol (pull/push, conflict rules, cursor/version)
- [ ] No authentication or per-device identity
- [ ] No production deploy story (HTTPS, single API URL for mobile builds)
- [ ] `tdtd-node` does not serve SPA; no documented hosted stack
- [ ] Excel import via `xlsx` — heavy; needs mobile file UX review
- [ ] No mobile-only feature flags in frontend
- [ ] No privacy policy / store listing assets

---

## Phase 0 — Product and security decisions

Complete before heavy implementation.

- [ ] **Confirm offline scope:** Which actions work offline? (Suggested MVP: read classes/students, take attendance AM/PM, view recent scores; defer or queue: bulk import, school-year subject registration.)
- [ ] **Single-teacher vs multi-teacher:** One SQLite file per device vs login per teacher (affects auth and sync).
- [ ] **Server role:** Always optional “home base” for backup/sync, or device-only with export? (Recommend: server sync for backup + second device.)
- [ ] **Conflict policy:** e.g. last-write-wins per row, or server wins on sync — document in schema docs.
- [ ] **Auth model:** Email/password, magic link, PIN, or device pairing code — required before public API.
- [ ] **Data at rest:** Encrypt local SQLite on mobile (OS keystore / SQLCipher) if storing student PII.
- [ ] **Web explicitly online-only:** Document in UI (“Install the mobile app for offline use”) on Home or settings.

---

## Phase 1 — Hosting and API (needed even for hybrid-online v1)

Mobile offline still needs a **sync endpoint** when online.

- [ ] Deploy `tdtd-node` to HTTPS host (VPS, Railway, Fly.io, school server, etc.).
- [ ] Persistent volume for `teacher_app.sqlite` + automated backup.
- [ ] Build `tdtd-frontend` for web with `VITE_API_URL` / same-origin `/api`.
- [ ] Optionally: serve `dist/` from Express or CDN; CORS locked to known origins (not `origin: true` in production).
- [ ] Environment matrix documented: `dev` (LAN), `staging`, `production`.
- [ ] Health check route `GET /api/health`.

---

## Phase 2 — Authentication and secure API

- [ ] Add auth to `tdtd-node` (sessions/JWT — pick one).
- [ ] Protect all mutating routes; rate-limit login.
- [ ] Mobile: secure token storage (Capacitor Preferences / Keychain, not `localStorage` for secrets).
- [ ] Web: same auth when using hosted API (browser session or token).
- [ ] Sync endpoints require authenticated user/device.

---

## Phase 3 — Mobile shell (Capacitor)

- [ ] Add Capacitor to `tdtd-frontend` (or monorepo package `tdtd-mobile-shell`).
- [ ] `webDir` → `dist`; scripts: `build` → `cap sync`.
- [ ] iOS + Android projects; bundle IDs, app name, icons, splash screens.
- [ ] `VITE_APP_TARGET=mobile` in mobile build pipeline.
- [ ] Status bar, safe areas (already partial in `AppShell`), Android back button with React Router.
- [ ] Deep links: `/attendance/session/:date?period=AM`, `/scores/event/:id`.
- [ ] File picker plugin for Excel import on mobile (if keeping import offline-queued).

---

## Phase 4 — Local database (mobile only)

- [ ] Choose SQLite plugin; run migrations on device (mirror `migrate.ts` rules or shared migration package).
- [ ] **Data access layer** in frontend or small `tdtd-mobile-core` module:
  - [ ] Web: existing `*Api.ts` → HTTP only.
  - [ ] Mobile: `*Repository.ts` → local SQLite; sync adapter when online.
- [ ] Feature flag: `isMobileApp()` / `isOfflineCapable()` — guard all local DB opens.
- [ ] Initial sync on first login: full pull from server.
- [ ] Seed empty local DB template for first-run offline (optional: “start offline, sync later”).

---

## Phase 5 — Sync design (mobile only)

- [ ] Server: sync API design (examples):
  - [ ] `GET /api/sync/pull?since={cursor}`
  - [ ] `POST /api/sync/push` (batched changes with idempotency keys)
- [ ] Change log on server and/or `updatedAt` + tombstones for deletes.
- [ ] Client: outbox table for offline mutations; retry with exponential backoff.
- [ ] UI: connection status bar (“Offline — changes saved on this device”, “Syncing…”, “Up to date”).
- [ ] Manual “Sync now” button in mobile app settings.
- [ ] Conflict handling per table (document in `.cursor/schemas/` or new `sync.md`).
- [ ] Recents / activity log: decide if mobile logs locally only or sync to server.

---

## Phase 6 — Mobile UX and web/mobile divergence

- [ ] Hide or disable offline-only messaging on web.
- [ ] Mobile settings screen: sync status, last synced time, storage size, “Sync now”, optional “Clear local data”.
- [ ] Excel import: mobile file UX; consider deferring bulk import to online sync only.
- [ ] Attendance: prioritize offline (main use case) — large touch targets already started.
- [ ] Score grading: offline draft entries in local DB; sync `score_events` + `score_entries`.
- [ ] Test two-column layouts collapse on phone (Scores, Classes) — already `lg:` based.

---

## Phase 7 — Quality, security review, release

- [ ] Test matrix: iOS + Android, offline → online → offline, airplane mode during attendance save.
- [ ] No regression: web build never writes to local SQLite.
- [ ] Pen test checklist: auth bypass, IDOR on class/student IDs, sync replay.
- [ ] Privacy policy + data retention (student PII).
- [ ] App Store / Play Console assets, screenshots, description mentioning offline for mobile only.
- [ ] CI: build web + build mobile artifact (AAB/IPA or internal TestFlight/Play internal testing).

---

## Phase 8 — Documentation updates (when implementing)

- [ ] New entry in [README.md](./README.md) index → this file (done when plan was added).
- [ ] `MOB-001` … entries in a future `Mobile-Function-Doc.md` for shipped milestones.
- [ ] Update [`.cursor/schemas/README.md`](../schemas/README.md): “mobile local replica + sync”.
- [ ] Update [UI-Rules.md](../rules/UI-Rules.md): web vs mobile capability matrix.

---

## Suggested implementation order

1. Phase 0 decisions (1–2 sessions)
2. Phase 1 hosting + Phase 2 auth (unblocks secure mobile and web)
3. Phase 3 Capacitor shell (app installs, still online-only) — optional milestone: **mobile app v0**
4. Phase 4 local DB + Phase 5 sync — **mobile app v1 with offline**
5. Phase 6–7 polish and store submission

---

## Explicit non-goals (for first mobile release)

- Offline mode in **browser** / PWA
- Full peer-to-peer sync between two phones without server
- Rewriting UI in Swift/Kotlin (unless Capacitor proves insufficient)
- Real-time multiplayer / live collaboration

---

## Open questions (fill in before Phase 4)

| # | Question | Decision |
|---|----------|----------|
| 1 | Capacitor in same repo as `tdtd-frontend` or separate? | |
| 2 | Can web and mobile share one React codebase with adapters? | |
| 3 | Server mandatory for first mobile launch, or weeks of offline-only OK? | |
| 4 | One teacher per phone — enforce via auth? | |
| 5 | Delete/student GDPR — export and wipe local + server? | |

---

## Quick reference: current stack

| Layer | Today | Mobile target |
|-------|--------|----------------|
| UI | React 19 + Vite + Tailwind | Same + Capacitor |
| Web data | REST only | REST only (unchanged) |
| Server | `tdtd-node` + better-sqlite3 | Same + sync routes |
| Mobile data | — | Device SQLite + outbox sync |

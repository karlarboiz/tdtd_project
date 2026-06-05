# Authentication — function documentation

Email/password **signup** and **login** with **JWT access tokens** and **opaque refresh tokens** (stored hashed in SQLite). All `/api/*` routes except public auth actions require a valid access token.

**Canonical schema:** [auth.md](../schemas/auth.md)  
**Status:** Shipped (AUTH-001) — temporary v1; profile and admin tooling will expand later.

---

## v1 scope (shipped)

| Feature | Behavior |
|---------|----------|
| **Signup** | `firstName`, `lastName`, `email`, `password` (min 8 chars). Default role `teacher`; **first account** in an empty DB becomes `admin`. |
| **Login** | Email + password; generic error on failure. |
| **Tokens** | Short-lived JWT access token + refresh token in JSON body (sessionStorage on web). |
| **Refresh** | Rotates refresh token; old token revoked. |
| **Logout** | Revokes refresh token server-side; client clears storage. |
| **Me** | `GET /api/auth/me` with Bearer access token. |
| **API guard** | All other `/api/*` routes use `authenticate` middleware. |
| **Inactivity timeout** | After **4 minutes** without user input, a warning modal appears with a **60-second** countdown; at **5 minutes** total idle the client calls `logout()` and redirects to `/login`. Timer pauses while the browser tab is hidden. Independent of JWT refresh (API activity does not reset the idle clock). |

### Not in v1

- HttpOnly refresh cookies
- Admin user-management routes (`POST /users`, role patches)
- Password reset, 2FA, rate limiting, `npm run seed:admin`
- Protecting batch JVM with auth (batch still uses shared SQLite file)

---

## Data model

See [auth.md](../schemas/auth.md) — tables `users`, `refresh_tokens`.

---

## API

| Method | Path | Auth |
|--------|------|------|
| POST | `/api/auth/signup` | Public |
| POST | `/api/auth/login` | Public |
| POST | `/api/auth/refresh` | Public (body: `{ refreshToken }`) |
| POST | `/api/auth/logout` | Public (body: `{ refreshToken }`) → `204` |
| GET | `/api/auth/me` | Bearer access token |

**Login / refresh success body:**

```json
{
  "accessToken": "...",
  "refreshToken": "...",
  "user": {
    "id": "...",
    "firstName": "...",
    "lastName": "...",
    "email": "...",
    "role": "teacher",
    "isActive": true
  }
}
```

---

## Environment (tdtd-node)

| Variable | Default (dev) | Purpose |
|----------|---------------|---------|
| `TDTD_JWT_ACCESS_SECRET` | dev placeholder | HS256 access JWT secret — **set in production** |
| `TDTD_REFRESH_TOKEN_PEPPER` | dev placeholder | HMAC input for refresh token hash |
| `TDTD_ACCESS_TOKEN_TTL_MINUTES` | `15` | Access token lifetime |
| `TDTD_REFRESH_TOKEN_TTL_DAYS` | `14` | Refresh token lifetime |

---

## Architecture

```text
tdtd-frontend (sessionStorage tokens)
    → Authorization: Bearer <access>
    → tdtd-node /api/auth/* (public subset)
    → tdtd-node /api/* + authenticate middleware
    → SQLite users + refresh_tokens
```

**Module layout:**

- `src/lib/email.ts`, `password.ts`, `tokens.ts`, `auth-config.ts`
- `src/dao/user.dao.ts`, `refreshToken.dao.ts`
- `src/services/auth.service.ts`
- `src/controllers/auth.controller.ts`
- `src/routes/auth.routes.ts`
- `src/middleware/authenticate.ts`, `authorize.ts` (authorize ready for admin routes)

**Frontend:**

- `src/contexts/AuthContext.tsx`
- `src/pages/Login`, `src/pages/Signup`
- `src/components/RequireAuth`
- `src/lib/authStorage.ts`, `src/api/authApi.ts`
- `src/lib/http.ts` — attaches Bearer; retries once after refresh on `401`
- `src/lib/inactivityConfig.ts` — idle timeout constants (4 min warning, 5 min logout)
- `src/hooks/useInactivityTimeout.ts`, `src/hooks/inactivityTimer.ts` — idle timer with tab-pause
- `src/components/InactivityWarningModal` — countdown warning before auto-logout
- `src/layouts/AppShell.tsx` — mounts idle timeout for authenticated shell only

---

## Client inactivity timeout

Frontend-only session guard for shared classroom devices. Server JWT/refresh lifetimes are unchanged.

| Item | Detail |
|------|--------|
| **Warning** | Modal at 4 min idle: “You will be signed out in N seconds due to inactivity.” |
| **Logout** | 5 min total idle → `logout()` (revokes refresh token) + navigate to `/login` |
| **Stay signed in** | Primary button resets idle timers and closes the modal |
| **Activity** | `pointerdown`, `keydown`, `click`, `scroll`, `touchstart` on `window` |
| **Tab hidden** | Timers paused; countdown display paused; resume with remaining time on return |
| **Scope** | Only inside `AppShell` (authenticated routes); not on `/login` or `/signup` |

Constants in `tdtd-frontend/src/lib/inactivityConfig.ts`:

- `INACTIVITY_WARNING_MS` = 240_000 (4 min)
- `INACTIVITY_LOGOUT_MS` = 300_000 (5 min)
- `INACTIVITY_COUNTDOWN_MS` = 60_000 (1 min between warning and logout)

---

## Security notes (v1)

- Passwords: scrypt via `node:crypto`
- Refresh tokens: random opaque string; only SHA-256 hash stored
- Login errors: `Invalid email or password` (no email enumeration)
- Signup duplicate email: `409` with explicit message (signup only)
- Inactive users: `403` on login/refresh/me

---

## Entry AUTH-001 — Email signup, login, tokens (initial)

**Date:** 2026-06-03

**Summary:** SQLite `users` + `refresh_tokens`, auth REST API, JWT access + rotating refresh, frontend login/signup and protected app routes.

**Reason:** Teachers need accounts before hosted/mobile sync; tokens gate API access without embedding secrets in the client beyond session storage.

**What changed**

- Migration `migrateAuthTables` in `tdtd-node/src/db/migrate.ts`
- Auth service, DAOs, middleware, routes; `app.ts` mounts `/api/auth` then `authenticate` on remaining API
- Vitest: `auth.service.test.ts`
- Frontend: Login, Signup, `AuthProvider`, `RequireAuth`, Bearer + refresh in `http.ts`
- Schema doc [auth.md](../schemas/auth.md)

**Files involved**

- `tdtd-node/src/db/migrate.ts`, `schema/types.ts`, `schema/constants.ts`, `app.ts`, auth modules under `src/`
- `tdtd-frontend/src/App.tsx`, `contexts/AuthContext.tsx`, `pages/Login`, `pages/Signup`, `lib/http.ts`, `lib/authStorage.ts`, `api/authApi.ts`, `types/schema.ts`, `layouts/AppShell.tsx`
- `.cursor/schemas/auth.md`, this file

**Schemas involved**

- [auth.md](../schemas/auth.md)

---

## Entry AUTH-002 — Client inactivity timeout

**Date:** 2026-06-05

**Summary:** Authenticated web shell warns after 4 minutes idle and auto-logs out at 5 minutes, with tab-hidden pause.

**Reason:** Shared classroom devices should not stay signed in indefinitely when a teacher steps away; warning gives a chance to stay signed in without disrupting active use.

**What changed**

- `inactivityConfig.ts` — timeout constants
- `inactivityTimer.ts` + `useInactivityTimeout.ts` — idle scheduling, activity reset, visibility pause
- `InactivityWarningModal.tsx` — 60s countdown + “Stay signed in”
- `AppShell.tsx` — wires hook, modal, and logout redirect
- Vitest: `useInactivityTimeout.test.ts`

**Files involved**

- `tdtd-frontend/src/lib/inactivityConfig.ts`
- `tdtd-frontend/src/hooks/inactivityTimer.ts`, `useInactivityTimeout.ts`, `useInactivityTimeout.test.ts`
- `tdtd-frontend/src/components/InactivityWarningModal/InactivityWarningModal.tsx`
- `tdtd-frontend/src/layouts/AppShell.tsx`
- this file

---

## Verify locally

```bash
cd tdtd-node && npm run build && npm test
cd tdtd-frontend && npm run build
```

1. Start API: `cd tdtd-node && npm start`
2. Start UI: `cd tdtd-frontend && npm run dev`
3. Open `/signup`, create account, land on Home
4. Sign out → `/login` → sign in again
5. `GET /api/classes` without token → `401`
6. Sign in, stay idle 4 min → warning modal with countdown; click **Stay signed in** → modal closes
7. Stay idle through full countdown → redirected to `/login`, tokens cleared
8. Switch tab away during countdown → timer pauses; return before expiry → countdown resumes

---

## Future (from original blueprint)

- `npm run seed:admin` and admin-only user CRUD
- HttpOnly refresh cookie for production
- Rate limiting, password reset, lockout
- `authorize('admin')` on management routes
- Optional `GET /api/home` after login (dashboard aggregate)

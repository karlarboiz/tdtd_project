# Authentication — function documentation

Email/password **signup** and **login** with **JWT access tokens** and **opaque refresh tokens** (stored hashed in SQLite). All `/api/*` routes except public auth actions require a valid access token. Passwords must be changed every **60 days**; forgot/reset password is available via SMTP.

**Canonical schema:** [auth.md](../schemas/auth.md)  
**Status:** Shipped (AUTH-001, AUTH-002, AUTH-003).

---

## v1 scope (shipped)

| Feature | Behavior |
|---------|----------|
| **Signup** | `firstName`, `lastName`, `email`, `password` (min 8 chars). Default role `teacher`; **first account** in an empty DB becomes `admin`. |
| **Login** | Email + password; generic error on failure. Succeeds even when password is expired. |
| **Tokens** | Short-lived JWT access token + refresh token in JSON body (sessionStorage on web). |
| **Refresh** | Rotates refresh token; old token revoked. |
| **Logout** | Revokes refresh token server-side; client clears storage. |
| **Me** | `GET /api/auth/me` with Bearer access token. |
| **API guard** | All other `/api/*` routes use `authenticate` + `requireFreshPassword` middleware. |
| **Inactivity timeout** | After **4 minutes** without user input, a warning modal appears with a **60-second** countdown; at **5 minutes** total idle the client calls `logout()` and redirects to `/login`. Timer pauses while the browser tab is hidden. Independent of JWT refresh (API activity does not reset the idle clock). |

### Password policy (AUTH-003)

| Feature | Behavior |
|---------|----------|
| **60-day expiration** | Passwords must be changed every 60 days (`TDTD_PASSWORD_MAX_AGE_DAYS`, default 60). Login still succeeds; app API blocked until changed. |
| **Change password** | `POST /api/auth/change-password` (Bearer). Requires current + new password. Revokes all refresh tokens; returns new token pair. |
| **Forgot password** | `POST /api/auth/forgot-password` — always `204` (no email enumeration). Sends reset link via SMTP (or logs link in dev when SMTP unset). |
| **Reset password** | `POST /api/auth/reset-password` — token from email + new password. Sets `password_changed_at`; revokes refresh tokens; returns token pair. |

### Not in v1

- HttpOnly refresh cookies
- Admin user-management routes (`POST /users`, role patches)
- 2FA, rate limiting, `npm run seed:admin`
- Protecting batch JVM with auth (batch still uses shared SQLite file)

---

## Data model

See [auth.md](../schemas/auth.md) — tables `users`, `refresh_tokens`, `password_reset_tokens`.

---

## API

| Method | Path | Auth |
|--------|------|------|
| POST | `/api/auth/signup` | Public |
| POST | `/api/auth/login` | Public |
| POST | `/api/auth/refresh` | Public (body: `{ refreshToken }`) |
| POST | `/api/auth/logout` | Public (body: `{ refreshToken }`) → `204` |
| POST | `/api/auth/forgot-password` | Public (body: `{ email }`) → `204` |
| POST | `/api/auth/reset-password` | Public (body: `{ token, password }`) |
| GET | `/api/auth/me` | Bearer access token |
| POST | `/api/auth/change-password` | Bearer (body: `{ currentPassword, newPassword }`) |

**Login / refresh / change / reset success body:**

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
    "isActive": true,
    "passwordChangedAt": 1717500000000,
    "mustChangePassword": false,
    "passwordExpiresAt": 1722684000000
  }
}
```

**Expired password on protected routes:** `403` with `{ "error": "Password expired", "code": "PASSWORD_EXPIRED" }`.

---

## Environment (tdtd-node)

| Variable | Default (dev) | Purpose |
|----------|---------------|---------|
| `TDTD_JWT_ACCESS_SECRET` | dev placeholder | HS256 access JWT secret — **set in production** |
| `TDTD_REFRESH_TOKEN_PEPPER` | dev placeholder | HMAC input for refresh/reset token hash |
| `TDTD_ACCESS_TOKEN_TTL_MINUTES` | `15` | Access token lifetime |
| `TDTD_REFRESH_TOKEN_TTL_DAYS` | `14` | Refresh token lifetime |
| `TDTD_PASSWORD_MAX_AGE_DAYS` | `60` | Max password age before forced change |
| `TDTD_PASSWORD_RESET_TTL_MINUTES` | `60` | Reset link validity |
| `TDTD_APP_URL` | `http://localhost:5173` | Frontend base URL for reset links |
| `TDTD_SMTP_HOST` | — | SMTP host for password reset emails |
| `TDTD_SMTP_PORT` | `587` | SMTP port |
| `TDTD_SMTP_USER` | — | SMTP username (optional) |
| `TDTD_SMTP_PASS` | — | SMTP password (optional) |
| `TDTD_SMTP_FROM` | falls back to user | From address for reset emails |

When SMTP is not configured, reset links are logged to the server console for local development.

---

## Architecture

```text
tdtd-frontend (sessionStorage tokens)
    → Authorization: Bearer <access>
    → tdtd-node /api/auth/* (public subset + Bearer change-password)
    → tdtd-node /api/* + authenticate + requireFreshPassword
    → SQLite users + refresh_tokens + password_reset_tokens
    → nodemailer SMTP (forgot password)
```

**Module layout:**

- `src/lib/email.ts`, `password.ts`, `tokens.ts`, `auth-config.ts`, `mail.ts`
- `src/dao/user.dao.ts`, `refreshToken.dao.ts`, `passwordResetToken.dao.ts`
- `src/services/auth.service.ts`
- `src/controllers/auth.controller.ts`
- `src/routes/auth.routes.ts`
- `src/middleware/authenticate.ts`, `requireFreshPassword.ts`, `authorize.ts`

**Frontend:**

- `src/contexts/AuthContext.tsx`
- `src/pages/Login`, `Signup`, `ChangePassword`, `ForgotPassword`, `ResetPassword`
- `src/components/RequireAuth`, `RequireFreshPassword`
- `src/lib/authStorage.ts`, `src/api/authApi.ts`
- `src/lib/http.ts` — attaches Bearer; retries once after refresh on `401`
- `src/lib/inactivityConfig.ts` — idle timeout constants (4 min warning, 5 min logout)
- `src/hooks/useInactivityTimeout.ts`, `src/hooks/inactivityTimer.ts` — idle timer with tab-pause
- `src/components/InactivityWarningModal` — countdown warning before auto-logout
- `src/layouts/AppShell.tsx` — mounts idle timeout for authenticated shell only

### Frontend routes (password)

| Route | Auth | Purpose |
|-------|------|---------|
| `/change-password` | Bearer required | Forced or voluntary password change |
| `/forgot-password` | Public | Request reset email |
| `/reset-password?token=...` | Public | Set new password from email link |

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

**Dev testing:** In `npm run dev` only, override via `.env.local` (see `tdtd-frontend/.env.example`). Restart the dev server after changes. Example for a 10s / 15s cycle:

```env
VITE_INACTIVITY_WARNING_MS=10000
VITE_INACTIVITY_LOGOUT_MS=15000
```

Overrides are ignored in production builds. Changing timeout values restarts the idle timer automatically (hook depends on `warningMs` / `logoutMs`).

---

## Security notes

- Passwords: scrypt via `node:crypto`
- Refresh tokens: random opaque string; only SHA-256 hash stored
- Reset tokens: opaque, hashed at rest, single-use, short TTL
- Login errors: `Invalid email or password` (no email enumeration)
- Forgot password: always `204` (no email enumeration)
- Signup duplicate email: `409` with explicit message (signup only)
- Inactive users: `403` on login/refresh/me
- Password change / reset revokes all refresh sessions

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

## Entry AUTH-003 — Password expiration and forgot password

**Date:** 2026-06-10

**Summary:** 60-day mandatory password rotation with forced change-password flow; forgot/reset password via SMTP.

**Reason:** Security policy requires periodic password updates; teachers need self-service recovery when passwords are forgotten.

**What changed**

- Migration: `password_changed_at` on `users`, `password_reset_tokens` table (`migrateAuthPasswordPolicy`)
- Auth service: expiration check, `changePassword`, `forgotPassword`, `resetPassword`
- Middleware: `requireFreshPassword` on protected API routes
- Mail: nodemailer SMTP (`src/lib/mail.ts`); console fallback when SMTP unset
- Frontend: `ChangePassword`, `ForgotPassword`, `ResetPassword` pages; `RequireFreshPassword` guard; login redirect + forgot link
- Vitest: auth.service tests for expiry and reset

**Files involved**

- `tdtd-node/src/db/migrate.ts`, `schema/types.ts`, `dao/user.dao.ts`, `dao/passwordResetToken.dao.ts`
- `tdtd-node/src/lib/auth-config.ts`, `lib/mail.ts`, `services/auth.service.ts`, `controllers/auth.controller.ts`, `routes/auth.routes.ts`
- `tdtd-node/src/middleware/authenticate.ts`, `middleware/requireFreshPassword.ts`, `app.ts`
- `tdtd-node/src/services/auth.service.test.ts`
- `tdtd-frontend/src/App.tsx`, `contexts/AuthContext.tsx`, `api/authApi.ts`, `lib/http.ts`, `types/schema.ts`
- `tdtd-frontend/src/pages/ChangePassword`, `ForgotPassword`, `ResetPassword`, `Login`
- `tdtd-frontend/src/components/RequireFreshPassword`
- `.cursor/schemas/auth.md`, this file

**Schemas involved**

- [auth.md](../schemas/auth.md)

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
9. Login with account whose password is > 60 days old → redirected to `/change-password`; API calls return `403 PASSWORD_EXPIRED`
10. Change password → access app normally
11. `/forgot-password` → receive email (or console log in dev) → `/reset-password?token=...` → signed in

---

## Future (from original blueprint)

- `npm run seed:admin` and admin-only user CRUD
- HttpOnly refresh cookie for production
- Rate limiting, lockout
- `authorize('admin')` on management routes
- Optional `GET /api/home` after login (dashboard aggregate)

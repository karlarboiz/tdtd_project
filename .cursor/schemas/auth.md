# Authentication schema (temporary v1)

**Status:** Shipped (AUTH-001 + AUTH-003) — email/password signup and login with JWT access + opaque refresh tokens; 60-day password policy and forgot/reset password.

**Related:** [Authentication-Function.md](../documentation/Authentication-Function.md)

---

## Tables

### `users`

| Column (SQLite) | TypeScript | Notes |
|-----------------|------------|--------|
| `id` | `id` | TEXT PK, UUID |
| `first_name` | `firstName` | TEXT NOT NULL |
| `last_name` | `lastName` | TEXT NOT NULL |
| `email` | `email` | TEXT NOT NULL (display / login input) |
| `email_normalized` | — | TEXT NOT NULL, `LOWER(TRIM(email))`, unique |
| `password_hash` | — | scrypt hash (never exposed) |
| `role` | `role` | `admin` \| `teacher` |
| `is_active` | `isActive` | 0 \| 1 |
| `password_changed_at` | `passwordChangedAt` | INTEGER ms — set on signup, change, reset |
| `created_at` | `createdAt` | INTEGER ms |
| `updated_at` | `updatedAt` | INTEGER ms, optional |

**Signup (v1):** public registration creates `teacher` unless no users exist (first account → `admin` bootstrap).

**Indexes:** unique on `email_normalized`; optional on `role`, `is_active`.

### `refresh_tokens`

| Column (SQLite) | TypeScript | Notes |
|-----------------|------------|--------|
| `id` | `id` | TEXT PK, UUID |
| `user_id` | `userId` | FK → `users.id` |
| `token_hash` | — | SHA-256 of opaque refresh token |
| `expires_at` | `expiresAt` | INTEGER ms |
| `revoked_at` | `revokedAt` | INTEGER ms, nullable |
| `created_at` | `createdAt` | INTEGER ms |
| `replaced_by_token_id` | `replacedByTokenId` | rotation chain, nullable |

Store **hash only**; raw refresh token returned once to client on login/refresh/signup.

### `password_reset_tokens`

| Column (SQLite) | TypeScript | Notes |
|-----------------|------------|--------|
| `id` | `id` | TEXT PK, UUID |
| `user_id` | `userId` | FK → `users.id` |
| `token_hash` | — | SHA-256 of opaque reset token (same pepper as refresh) |
| `expires_at` | `expiresAt` | INTEGER ms (default 1 hour) |
| `used_at` | `usedAt` | INTEGER ms, nullable — single-use |
| `created_at` | `createdAt` | INTEGER ms |

Index on `token_hash` (unique).

---

## API types (public user)

```ts
UserRole = 'admin' | 'teacher'

AuthUser = {
  id: string
  firstName: string
  lastName: string
  email: string
  role: UserRole
  isActive: boolean
  passwordChangedAt: number
  mustChangePassword: boolean   // computed from password_changed_at + max age
  passwordExpiresAt: number    // computed
}

AuthTokensResponse = {
  accessToken: string
  refreshToken: string
  user: AuthUser
}
```

---

## Endpoints

| Method | Path | Auth |
|--------|------|------|
| POST | `/api/auth/signup` | Public |
| POST | `/api/auth/login` | Public |
| POST | `/api/auth/refresh` | Public (refresh token body) |
| POST | `/api/auth/logout` | Public (refresh token body) → `204` |
| POST | `/api/auth/forgot-password` | Public (body: `{ email }`) → `204` always |
| POST | `/api/auth/reset-password` | Public (body: `{ token, password }`) → token pair |
| GET | `/api/auth/me` | Bearer access token |
| POST | `/api/auth/change-password` | Bearer (body: `{ currentPassword, newPassword }`) → token pair |

All other `/api/*` routes require `Authorization: Bearer <accessToken>` **and** a password that is not expired (`requireFreshPassword` middleware). Expired passwords return `403` with `{ error: "Password expired", code: "PASSWORD_EXPIRED" }`.

Allowed while password is expired: `change-password`, `me`, `logout`, `refresh`.

---

## Future (not shipped)

- Admin user management (`POST /users`, role/active patches)
- HttpOnly refresh cookie
- 2FA, lockout, rate limiting
- Per-tenant / school scoping on rows

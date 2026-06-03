# Authentication schema (temporary v1)

**Status:** Shipped (AUTH-001) — basic email/password signup and login with JWT access + opaque refresh tokens.

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
}

AuthTokensResponse = {
  accessToken: string
  refreshToken: string
  user: AuthUser
}
```

---

## Endpoints (v1)

| Method | Path | Auth |
|--------|------|------|
| POST | `/api/auth/signup` | Public |
| POST | `/api/auth/login` | Public |
| POST | `/api/auth/refresh` | Public (refresh token body) |
| POST | `/api/auth/logout` | Public (refresh token body) |
| GET | `/api/auth/me` | Bearer access token |

All other `/api/*` routes require `Authorization: Bearer <accessToken>`.

---

## Future (not v1)

- Admin user management (`POST /users`, role/active patches)
- HttpOnly refresh cookie
- Password reset, 2FA, lockout, rate limiting
- Per-tenant / school scoping on rows

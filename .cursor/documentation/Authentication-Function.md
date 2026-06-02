# Authentication Function (Admin / Teacher)

## Purpose

Implement secure authentication for TDTD with support for user roles (`admin`, `teacher`) and compatibility with the current backend architecture (routes/controllers/services/dao plus SQLite migrations).

## Goals

- Secure login for users (email/password)
- Session continuity via refresh flow
- Server-enforced identity for all protected routes
- Seamless integration with role-based authorization

## Recommended Auth Model

Use:

- Access token (short-lived, e.g. 15 minutes)
- Refresh token (longer-lived, e.g. 7 to 30 days, rotated)

Why:

- works well with API architecture
- keeps access tokens short-lived
- allows revocation and better security control via refresh-token store

## Data Model Blueprint (SQLite)

Add to migration flow in `src/db/migrate.ts`.

### users table

Columns:

- `id TEXT PRIMARY KEY`
- `email TEXT NOT NULL`
- `password_hash TEXT NOT NULL`
- `role TEXT NOT NULL CHECK(role IN ('admin','teacher'))`
- `is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0,1))`
- `created_at INTEGER NOT NULL`
- `updated_at INTEGER`

Constraints and indexes:

- unique index on normalized email (`LOWER(TRIM(email))`) strategy
- optional index on `role`
- optional index on `is_active`

### refresh_tokens table

Columns:

- `id TEXT PRIMARY KEY`
- `user_id TEXT NOT NULL`
- `token_hash TEXT NOT NULL`
- `expires_at INTEGER NOT NULL`
- `revoked_at INTEGER`
- `created_at INTEGER NOT NULL`
- `replaced_by_token_id TEXT` (optional rotation chain)

FK:

- `user_id -> users.id`

Indexes:

- `idx_refresh_tokens_user_id`
- `idx_refresh_tokens_expires_at`
- unique on `token_hash`

Store only token hash, never raw refresh token.

## Bootstrap Admin Strategy

Implement one-time bootstrap path:

- If no admin exists, allow creation of first admin (CLI or protected init flow).
- After first admin exists, only existing admin can create another admin.

Recommended script:

- `npm run seed:admin` creates first admin with strong password input.
- Immediately rotate password after first login if seeded from env.

## API Contract Blueprint

### Public auth endpoints

#### POST /auth/login

Input:

- `email`
- `password`

Output:

- access token
- refresh token (prefer `HttpOnly` secure cookie; alternative body field)

Errors:

- `401` invalid credentials
- `403` inactive account

#### POST /auth/refresh

Input:

- refresh token (cookie/body)

Behavior:

- validate hash plus expiry plus revocation
- rotate refresh token
- return new access token (and new refresh token)

Errors:

- `401` invalid/expired/reused token

#### POST /auth/logout

Behavior:

- revoke current refresh token (or all user tokens for global logout)

#### GET /auth/me

Behavior:

- return authenticated user profile (`id`, `email`, `role`, `isActive`)

### Admin user-management endpoints

#### POST /users

Create user with role (`admin` or `teacher`) - admin only.

#### PATCH /users/:id/role

Change role - admin only.

#### PATCH /users/:id/active

Activate/deactivate user - admin only.

## Project-Specific Module Layout

Suggested files aligned to existing architecture:

- `src/controllers/auth.controller.ts`
- `src/services/auth.service.ts`
- `src/dao/auth.dao.ts` (or user/refresh-token DAO split)
- `src/routes/auth.routes.ts`

Likely supporting files:

- `src/middleware/authenticate.ts`
- `src/middleware/authorize.ts`
- `src/lib/password.ts` (hash/verify)
- `src/lib/tokens.ts` (sign/verify/generate token ids)

Route registration:

- Plug `auth.routes` and `user.routes` into server route composition used by current app.

## Security Standards

- Password hashing: Argon2id (preferred) or bcrypt with strong cost.
- Validate password policy (minimum length plus baseline complexity).
- Normalize email before lookup.
- Rate-limit login endpoint.
- Do not reveal whether email exists (generic auth error message).
- Do not log credentials or raw tokens.
- Invalidate refresh tokens on password reset/role downgrade/deactivation.

Cookie settings (if cookie-based refresh token):

- `HttpOnly: true`
- `Secure: true` (production)
- `SameSite: Lax` or `Strict` based on client architecture

## Authorization Integration

After authentication is in place:

- All protected routes require `authenticate`.
- Role-sensitive routes require `authorize('admin')`.
- Teacher operational routes allow `authorize('admin', 'teacher')` where appropriate.

## Migration and Rollout Phases

### Phase 1 - Foundation

- Add `users` and `refresh_tokens` tables
- Implement password hashing and login
- Add `/auth/me`

### Phase 2 - Session lifecycle

- Implement refresh plus rotation plus logout
- Add token revocation checks

### Phase 3 - RBAC integration

- Add role middleware
- Guard admin-only endpoints

### Phase 4 - Hardening

- Rate limiting
- audit logs
- improved alerting and monitoring for auth failures

## Testing Plan (Authentication)

### Unit tests

- password hash/verify
- token sign/verify
- refresh-token hash lookup and revocation logic

### Integration tests

- login success/failure
- refresh success/rotation/reuse rejection
- logout revocation
- inactive user blocked

### RBAC integration tests

- admin can access admin endpoints
- teacher gets `403` on admin endpoints
- both can access shared teacher workflow endpoints as configured

## Operational Checklist

- Set required env vars (JWT secrets, token TTLs, bootstrap controls)
- Run migrations
- Create first admin
- Verify `/auth/login` and `/auth/me`
- Verify admin can create teacher
- Verify teacher restrictions

## Future Enhancements

- Password reset flow (`password_resets` table)
- Optional 2FA for admin accounts
- Account lockout policy after repeated failed login
- Fine-grained permissions if role model expands beyond `admin`/`teacher`

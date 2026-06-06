# Role-Based Function (Admin / Teacher)

## Purpose

Define and enforce role-based authorization for the TDTD backend so that:

- `admin` can manage users, roles, and administrative operations.
- `teacher` can access day-to-day teaching features (attendance, scores, classes/subjects as allowed).

This document is a project-specific blueprint for implementing role-based access control (RBAC) in `tdtd-node`.

## Current Backend Shape (Project Context)

The backend is organized around:

- `src/routes/*`
- `src/controllers/*`
- `src/services/*`
- `src/dao/*`
- SQLite migrations in `src/db/migrate.ts`

This RBAC plan fits into the existing pattern by adding:

- auth/identity extraction middleware
- role authorization middleware
- guarded routes
- admin user-management service/controller/routes

## Role Definitions

### admin

Allowed to:

- Create users (`admin` or `teacher`)
- Change user role
- Activate/deactivate users
- View system-level audit info (optional, if implemented)

### teacher

Allowed to:

- Use attendance flows
- Use score flows
- Access class/subject operations that are not administrative user management

Not allowed to:

- Create or manage user roles
- Access admin-only endpoints

## Authorization Matrix (Initial)

| Feature / Endpoint Group | admin | teacher |
|---|---|---|
| Auth (`/auth/login`, `/auth/me`, `/auth/logout`) | Yes | Yes |
| User management (`/users`, role updates, deactivation) | Yes | No |
| Attendance (`/attendance/*`) | Yes | Yes |
| Scores (`/score*`) | Yes | Yes |
| School year config (`/school-year/*`) | Yes | Optional (read-only if desired) |
| Recents / due list / reminders | Yes | Yes |

Adjust this matrix if you want stricter boundaries (for example, only admin can mutate school year settings).

## Technical Blueprint (Project-Specific)

### 1) Add role-aware request context

Introduce an authenticated request shape used by controllers:

- `req.user.id`
- `req.user.role` (`admin` | `teacher`)
- `req.user.email` (optional convenience)

Use a shared type in a central location (for example `src/types/auth.ts`) so controllers/routes stay strongly typed.

### 2) Add middleware

#### authenticate

Responsibilities:

- Read access token (header/cookie depending on chosen flow)
- Validate token/session
- Load and verify active user
- Attach user context to request
- Reject with `401` if invalid

#### authorize(...roles)

Responsibilities:

- Check `req.user.role` against allowed roles
- Reject with `403` if role is insufficient

### 3) Route integration

In route modules under `src/routes`:

- Keep existing functional grouping.
- Add middleware at route or router level.

Pattern:

- `router.use(authenticate)` for protected group
- `router.post('/users', authorize('admin'), createUserController)` for admin-only operations

### 4) Service-level guardrails

Even with route middleware, keep sensitive checks in service layer for safety (defense in depth), especially for:

- role changes
- user deactivation
- bootstrap admin logic

### 5) Suggested new/updated modules

- `src/middleware/authenticate.ts`
- `src/middleware/authorize.ts`
- `src/controllers/user.controller.ts`
- `src/services/user.service.ts`
- `src/dao/user.dao.ts`
- `src/routes/user.routes.ts`
- Register new user routes in server route setup

### 6) Error semantics

- `401 Unauthorized`: missing/invalid auth
- `403 Forbidden`: valid auth but insufficient role
- `404 Not Found`: hide existence when appropriate (optional policy)
- `409 Conflict`: duplicate email or invalid role transition state

### 7) Audit and observability (recommended)

Log role-sensitive actions:

- who changed role
- old role to new role
- when and target user

This can use existing activity log patterns or a dedicated audit table.

## Security Notes

- Never trust client-provided role fields.
- Role comes only from verified server-side user identity.
- On role change, invalidate existing refresh tokens/sessions for that user (recommended).

## Test Plan (RBAC)

### Unit

- `authorize` permits allowed roles
- `authorize` rejects disallowed roles
- edge case: missing `req.user`

### Integration

- teacher blocked from admin endpoints (`403`)
- admin can manage users (`200/201`)
- inactive user blocked at auth middleware

### Regression

- Existing attendance/score endpoints still work for authenticated teacher/admin paths.

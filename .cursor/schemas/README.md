# Schema documentation index

Canonical table definitions for **Teacher's Dilemma Today** live in this folder.

## Backend-first

- **Storage:** SQLite (`data/teacher_app.sqlite`), opened by **tdtd-node** (`better-sqlite3`).
- **DDL:** [`tdtd-node/src/db/migrate.ts`](../../tdtd-node/src/db/migrate.ts)
- **REST:** `/api` (see `tdtd-node/src/app.ts`)
- **Frontend:** `tdtd-frontend` uses the API only; it does not embed an offline database.

Do not change schema structure unless explicitly instructed.

## Schema files

| File | Tables |
|------|--------|
| [core.md](./core.md) | `classes`, `students` |
| [attendance.md](./attendance.md) | `attendance_sessions`, `attendance_records` |
| [subjects.md](./subjects.md) | `school_years`, `subjects`, `school_year_subjects`, `class_subjects` |
| [quiz.md](./quiz.md) | `score_events`, `score_entries` |

## Naming convention

- **Docs / TypeScript:** camelCase field names (e.g. `classId`, `createdAt`).
- **SQLite columns:** snake_case (e.g. `class_id`, `created_at`).
- API layers map between the two.

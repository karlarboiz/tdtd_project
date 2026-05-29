# Schema-Rules.md

## Purpose

Agent index for **Teacher's Dilemma Today** database schema. Canonical table definitions live under [`.cursor/schemas/`](../schemas/); this file states architecture, scope, and cross-cutting rules.

All generated code must follow those schemas. Do not modify schema structure unless explicitly instructed.

**Scores (quiz, exam, participation):** see [Score-Function-Schema-Rules.md](./Score-Function-Schema-Rules.md) → [quiz.md](../schemas/quiz.md).

---

## Architecture

- **Backend-first:** SQLite in **tdtd-node** (Express REST API); default file `data/teacher_app.sqlite` (`better-sqlite3`).
- **Frontend** (`tdtd-frontend`) uses the API only — no embedded offline database.
- **DDL:** `tdtd-node/src/db/migrate.ts`
- **REST base path:** `/api` (`tdtd-node/src/app.ts`)
- Limited offline/sync may be added later for specific features — not the default model.

Full index: [schemas/README.md](../schemas/README.md).

Function change log: [documentation/README.md](../documentation/README.md).

---

## Tables in scope (this rule)

| # | Table | Schema doc |
|---|--------|------------|
| 1 | `classes` | [core.md](../schemas/core.md) |
| 2 | `students` | [core.md](../schemas/core.md) |
| 3 | `attendance_sessions` | [attendance.md](../schemas/attendance.md) |
| 4 | `attendance_records` | [attendance.md](../schemas/attendance.md) |

Subject tables (`school_years`, `subjects`, `school_year_subjects`, `class_subjects`): [subjects.md](../schemas/subjects.md). Score tables (`score_events`, `score_entries`): [quiz.md](../schemas/quiz.md). Activity log (`activity_logs`): [recents.md](../schemas/recents.md).

---

## Expected usage flow

1. Set active school year and register subjects ([subjects.md](../schemas/subjects.md))
2. Create class ([core.md](../schemas/core.md)) — one **section** per row: set `shift` to `MRNG` or `AFTNN`; do not mirror the same roster under both (see **Class shift and roster rules** in core.md and [Classes-Function-Doc.md](../documentation/Classes-Function-Doc.md))
3. Add students ([core.md](../schemas/core.md))
4. Assign subjects to classes ([subjects.md](../schemas/subjects.md))
5. Select date and period (AM/PM)
6. Create or reuse attendance session ([attendance.md](../schemas/attendance.md))
7. Save attendance records ([attendance.md](../schemas/attendance.md))

---

## Design principles

- Flat, relational tables; single source of truth on the server.
- Fast reads/writes on SQLite; optional targeted offline/sync later (not global IndexedDB mirroring).
- Room for future reporting without nested document storage.

---

## Anti-patterns (global)

- Embedding students inside class.
- Storing attendance inside student objects.
- Adding `classId` to `attendance_sessions`.
- Deeply nested structures or arrays as primary storage.
- Duplicating score or attendance data on `classes` / `students` rows.

Domain-specific anti-patterns: [attendance.md](../schemas/attendance.md), [quiz.md](../schemas/quiz.md).

---

## Future extensions (do not implement yet)

- Attendance statuses: absent, late ([attendance.md](../schemas/attendance.md)).
- Weighted grading / term averages ([quiz.md](../schemas/quiz.md)).
- DepEd report generation.
- Selective client-side caching or sync.

---

## Final note

Optimized for speed, simplicity, and real teacher workflows. Any generated code for core + attendance **must** match [core.md](../schemas/core.md) and [attendance.md](../schemas/attendance.md) exactly.

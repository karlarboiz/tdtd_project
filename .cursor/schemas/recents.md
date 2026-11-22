# Recents schema — activity logs

## Purpose

Append-only log of **teacher actions** (writes) for the Recents page. Depends on no other table via FK; `metadata` may reference ids that are later deleted.

---

## Table

### activity_logs

```
activity_logs: {
  id: string (uuid, primary key)
  userId: string // FK → users.id — owning teacher (GAP-001)
  action: string // machine code — see ActivityActions
  summary: string // human-readable line for UI
  metadata?: string // JSON: ActivityLogMetadata (camelCase keys in API)
  createdAt: number (timestamp ms)
}
```

---

## action codes (MVP)

| action | When logged |
|--------|-------------|
| `CLASS_CREATED` | Class created |
| `STUDENT_REGISTERED` | Single student registered |
| `STUDENTS_IMPORTED` | Bulk student import |
| `ATTENDANCE_SAVED` | Attendance session save |
| `SCHOOL_YEAR_CREATED` | School year created |
| `SCHOOL_YEAR_ACTIVATED` | Active school year set |
| `SUBJECT_REGISTERED` | Subject registered for SY |
| `SUBJECT_UNREGISTERED` | SY registration removed |
| `SUBJECT_ASSIGNED_TO_CLASS` | Subject linked to class |
| `SUBJECT_UNASSIGNED_FROM_CLASS` | Class–subject link removed |
| `SCORE_EVENT_CREATED` | Score event created |
| `SCORES_SAVED` | Score entries upserted for an event (summary: **Saved** vs **Updated** on re-save) |

---

## metadata (JSON, optional)

```ts
{
  classId?: string
  studentId?: string
  eventId?: string
  schoolYearId?: string
  date?: string       // YYYY-MM-DD — attendance
  period?: 'AM' | 'PM'
  count?: number
}
```

Used for deep links on the Recents page (not enforced FKs).

---

## Rules

- Log **after successful** mutations only.
- **One row per user-facing action** (not per score line or per import row).
- **`userId`** set from authenticated teacher on every insert.
- Do **not** log GET/read requests.
- `summary` is pre-rendered at write time (stable display if entities are renamed later).
- If insert into `activity_logs` fails, `recordActivity` logs an error and **does not** fail the parent mutation (scores, attendance, etc. still commit).

---

## API

- `GET /api/recents?limit=100` — newest first for authenticated teacher only (default limit 100, max 500).

DDL: `tdtd-node/src/db/migrate.ts` (`migrateActivityLogsTable`).

Logging: `tdtd-node/src/services/activityLog.service.ts` (`recordActivity`), called from domain services.

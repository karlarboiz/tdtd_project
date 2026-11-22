# Attendance schema

## Purpose

Defines **global** daily attendance: one session per calendar date + period (AM/PM), with an explicit per-student status of `present`, `absent`, or `late`.

Depends on [core.md](./core.md) (`classes`, `students`). Class filtering at save time uses `classes.shift` vs session `period`.

---

## Tables

### attendance_sessions

Represents a single attendance event for a specific day and period.

```
attendance_sessions: {
  id: string (uuid, primary key)
  date: string // format: "YYYY-MM-DD"
  period: string // "AM" | "PM"
  createdAt: number (timestamp)
}
```

### attendance_records

Represents attendance status per student in a session.

```
attendance_records: {
  id: string (uuid, primary key)
  sessionId: string // FK → attendance_sessions.id
  studentId: string // FK → students.id
  status: string // "present" | "absent" | "late"
  timestamp: number
}
```

---

## Rules

### attendance_sessions

- One session per **date + period** (globally, not per class).
- Prevent duplicate sessions for same date + period (`UNIQUE(date, period)` in SQLite).
- Do NOT include `classId` — this is a **global** attendance session.

### attendance_records

- One record per student per session (`UNIQUE(session_id, student_id)`).
- `status` is **`present`**, **`absent`**, or **`late`** (`CHECK (status IN ('present', 'absent', 'late'))`).
- Saving a class writes one row per student on that roster. Each row stores the chosen status. A missing row is not an absent or late mark.
- Must reference valid session and student.

---

## Relationships

```
Attendance Session (date + period)
└── Attendance Records → Student

Class (from core.md)
└── Students
```

Attendance records link students to a session; classes are used only when filtering which students appear for AM vs PM (via `shift`).

---

## Indexes

See `tdtd-node/src/db/migrate.ts`:

- `attendance_sessions`: primary key; **`UNIQUE(date, period)`**; `idx_sessions_date` on `date`.
- `attendance_records`: primary key; **`UNIQUE(session_id, student_id)`**; indexes on `session_id`, `student_id`.

---

## Business logic

### Attendance timing

- Attendance is taken once in the morning (**AM**) and once in the afternoon (**PM**).

### Save flow

1. Check if a session exists for the selected **date** and **period**.
2. If NOT → create new session.
3. Replace that class's records in the session: one row per submitted student, with status `present`, `absent`, or `late`.

### Class / shift filtering

- **AM** attendance → offer only classes with `shift = MRNG`.
- **PM** attendance → offer only classes with `shift = AFTNN`.

### Frontend session route

- Path: `/attendance/session/:date` with optional query **`?period=AM|PM`**.
- Calendar opens date without `period`; UI auto-selects the period that has saved data (or current clock period). See ATT-004 in [Attendance-Function-Doc.md](../documentation/Attendance-Function-Doc.md).

### Data integrity

- Do NOT create multiple sessions for the same date + period (DB enforces uniqueness).
- API in **tdtd-node** rejects any status outside `present`, `absent`, and `late`, and requires a status for every submitted class student.
- Existing databases rebuild `attendance_records` when the CHECK is still present-only. Copied rows keep `status = present`. SQLite cannot `ALTER` a CHECK constraint.

---

## Anti-patterns

- Storing attendance inside the `students` row.
- Adding `classId` to `attendance_sessions`.
- Nesting attendance arrays on class or student objects.
- Creating deeply nested JSON blobs as the primary store.
- Treating a missing `attendance_records` row as `absent` or `late`.

---

## Status values

Shipped on `attendance_records.status`: **`present`**, **`absent`**, and **`late`**. See ATT-006 in [Attendance-Function-Doc.md](../documentation/Attendance-Function-Doc.md).

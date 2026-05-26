# Student Lab — read model and API contract

## Purpose

Defines the **Student Lab** feature: a student-centric **read-only** view aggregating roster profile, shift-aware attendance, and recent quiz/exam/participation scores.

**No new SQLite tables.** All data is derived at query time from existing tables.

**Depends on:**

- [core.md](./core.md) — `students`, `classes` (`shift` drives attendance session eligibility)
- [attendance.md](./attendance.md) — `attendance_sessions`, `attendance_records`
- [quiz.md](./quiz.md) — `score_events`, `score_entries`
- [subjects.md](./subjects.md) — `subjects` (display name on score rows)

**Feature history:** [Student-Lab-Function-Doc.md](../documentation/Student-Lab-Function-Doc.md)

---

## UI routes (frontend)

| Route | Purpose |
|--------|---------|
| `/student-lab` | Class picker + student list |
| `/student-lab/:studentId` | Student Lab detail (profile, attendance, scores) |

**Deep links out (edits stay on existing pages):**

- Attendance row → `/attendance/session/:date?period=AM|PM`
- Score row → `/scores/event/:eventId`

---

## API overview

Base: `/api/students`

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/:studentId` | Student + class context (header / picker validation) |
| GET | `/:studentId/lab` | Aggregated lab payload (profile + attendance + scores) |

Existing list route unchanged: `GET /api/students?classId=`.

Register `/:studentId/lab` **before** or alongside `/:studentId` so `lab` is not parsed as an id.

---

## Query parameters — `GET /:studentId/lab`

| Param | Required | Default | Used for |
|--------|----------|---------|----------|
| `from` | No | today − 29 days | Attendance range start (`YYYY-MM-DD`) |
| `to` | No | today | Attendance range end |
| `scoresFrom` | No | same as `from` | Score list range start |
| `scoresTo` | No | same as `to` | Score list range end |

**All-time attendance:** omit `from` and `to` (or send empty) — server returns every shift-eligible session for the student.

**Validation:**

- `from` / `to` / `scoresFrom` / `scoresTo` must be valid `YYYY-MM-DD` when provided.
- `from` ≤ `to` (same for scores range).
- Max range span: **366 days** per range (match attendance calendar guard).

---

## Response shape — `StudentLabPayload`

```ts
{
  profile: {
    student: StudentRow
    class: ClassRow
  }
  attendance: {
    summary: {
      totalSessions: number
      presentCount: number
      absentCount: number
      presentRate: number // 0–100, 0 when totalSessions === 0
    }
    sessions: StudentLabAttendanceSessionRow[]
  }
  scores: {
    recentQuizzes: StudentLabScoreRow[]
    recentExams: StudentLabScoreRow[]
    recentParticipation: StudentLabScoreRow[]
  }
}
```

### `StudentLabAttendanceSessionRow`

```ts
{
  date: string       // "YYYY-MM-DD"
  period: "AM" | "PM"
  status: "present" | "absent"
}
```

Sorted **newest first** (`date DESC`, then `PM` before `AM` on same day or consistent period order).

### `StudentLabScoreRow`

```ts
{
  eventId: string
  kind: "QUIZ" | "EXAM" | "PARTICIPATION"
  title: string
  subjectName: string
  date?: string      // score_events.date when set
  score: number
  maxScore?: number
  recordedAt: number // score_entries.recorded_at (ms)
}
```

Only entries where `score_entries.score IS NOT NULL`. Omitted events with no recorded score.

---

## Attendance aggregation rules

### Shift eligibility

Global sessions are keyed by `date` + `period` only ([attendance.md](./attendance.md)). For **one student**, only sessions matching their class `shift` count:

| Class `shift` | Sessions in range |
|---------------|-------------------|
| `MRNG` | `period = AM` only |
| `AFTNN` | `period = PM` only |

PM sessions must **not** count as absent for a morning-section student (and vice versa).

### Present vs absent

- **`present`:** row exists in `attendance_records` for `(sessionId, studentId)`.
- **`absent`:** shift-eligible session in range with no record for that student.

MVP `status` on records is always `present`; absence is inferred from missing row.

### Summary

- `totalSessions` = count of `sessions` array.
- `presentCount` = sessions with `status: present`.
- `absentCount` = `totalSessions - presentCount`.
- `presentRate` = `round(100 * presentCount / totalSessions)` or `0` if `totalSessions === 0`.

---

## Scores aggregation rules

### Scope

- `score_events.class_id` must equal `students.class_id` for the student.
- `score_entries.student_id` = requested student.
- `score_events.kind` splits into three response arrays.

### Date filter

Include a row when the event’s sort date falls in `[scoresFrom, scoresTo]`:

- Sort date = `COALESCE(score_events.date, date(score_events.created_at / 1000, 'unixepoch'))` (document intent; implement in SQL consistently).

### Ordering

Within each kind array: sort date **DESC**, then `recorded_at` **DESC**.

### Integrity

Same as [quiz.md](./quiz.md): student must belong to the event’s class (enforced by join).

---

## Response shape — `GET /:studentId`

```ts
{
  student: StudentRow
  class: ClassRow
}
```

**404** if student id unknown.

---

## Indexes used (existing)

No migration required. Queries rely on:

- `idx_records_student` on `attendance_records(student_id)`
- `idx_score_entries_student` on `score_entries(student_id)`
- `attendance_sessions(date, period)` unique lookup
- `idx_students_class_id` on `students(class_id)`

---

## Anti-patterns

- Adding `attendance_summary` or `student_scores` columns on `students`.
- Storing denormalized lab snapshots in SQLite.
- Counting all AM+PM sessions for every student regardless of `classes.shift`.
- Including score events with `score IS NULL` in “recent scores” lists.
- Editing roster, attendance, or scores from Student Lab v1 (view-only; use existing routes).

---

## Future extensions (not in v1)

- `PATCH /api/students/:studentId` from Student Lab UI.
- Recents deep link when `metadata.studentId` is set.
- Cross-class student search on `/student-lab`.
- Charts, PDF export, photo on profile card.

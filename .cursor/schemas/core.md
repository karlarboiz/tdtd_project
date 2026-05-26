# Core schema — classes and students

## Purpose

Defines shared entities used by attendance and quiz/score flows: **classes** (student groups) and **students** (roster members).

Extends nothing. Referenced by [attendance.md](./attendance.md) and [quiz.md](./quiz.md).

---

## Tables

### classes

Represents a group of students (e.g., Grade 5).

```
classes: {
  id: string (uuid, primary key)
  name: string // e.g. "Grade 5"
  shift: string // "MRNG" | "AFTNN" — morning vs afternoon section schedule
  createdAt: number (timestamp)
  updatedAt?: number (timestamp, optional)
}
```

### students

Represents individual students.

```
students: {
  id: string (uuid, primary key)
  firstName: string
  middleName?: string // optional — nullable in SQLite
  lastName: string
  birthDate: string // format: "YYYY-MM-DD"
  gender: string // stored as "M" | "F" | "O" (Male / Female / Other)
  classId: string // FK → classes.id
  createdAt: number (timestamp)
}
```

---

## Rules

### classes

- `id` must be unique (UUID).
- `name` is required.
- `shift` is required: **`MRNG`** (morning section) or **`AFTNN`** (afternoon section).
- **Attendance UI:** when taking attendance for **AM**, only classes with **`shift = MRNG`** are offered; for **PM**, only **`shift = AFTNN`** (maps to `attendance_sessions.period` in [attendance.md](./attendance.md)).
- Do NOT embed students inside this object.

### students

- Each student belongs to ONE class.
- `classId` must reference an existing class.
- `firstName`, `lastName`, `birthDate`, and `gender` are required.
- Display name in UI: combine `firstName` + optional `middleName` + `lastName`.
- Do NOT store attendance or score data on this row.

---

## Relationships

```
Class
└── Students
```

---

## Indexes

See `tdtd-node/src/db/migrate.ts`:

- Primary keys on `classes.id`, `students.id`.
- `idx_students_class_id` on `students(class_id)`.
- `idx_students_sort` on `(class_id, last_name, first_name)` for roster ordering.

---

## Business logic

### Student registration

- Students can be added:
  - Manually (first / middle / last name, birth date, gender)
  - Via Excel import

- Excel import (**row 1 = headers**):
  - Required columns: **firstName**, **lastName**, **birthDate**, **gender**
  - Optional column: **middleName** (column may be omitted; cells may be empty)
  - **birthDate:** preferably `YYYY-MM-DD` (other common date strings may be accepted in the client parser)
  - **gender:** `M` / `F` / `O` or `Male` / `Female` / `Other` (normalized to M/F/O in the API)
  - Ignore completely empty data rows; trim whitespace on text fields
  - Sample file includes a **header row** plus example rows for teachers

### Data integrity

- Do NOT duplicate students unnecessarily.
- Do NOT store nested objects in tables.
- API business logic in **tdtd-node** should enforce the same rules when accepting writes.

---

## Anti-patterns

- Embedding students inside class.
- Storing attendance or scores on `students` or `classes` without normalized child tables.
- Using arrays as primary storage.

---

## Future extensions

Do not implement yet:

- DepEd report generation (depends on stable core roster).
- Selective client-side caching or sync for roster data.

**Student Lab** (shipped separately): read-only aggregation of roster + attendance + scores — see [student-lab.md](./student-lab.md). No columns added to `students` or `classes`.

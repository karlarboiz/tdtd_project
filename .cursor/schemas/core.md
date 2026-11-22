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
  userId: string // FK → users.id — owning teacher (GAP-001)
  name: string // e.g. "Grade 5"
  shift: string // "MRNG" | "AFTNN" — morning vs afternoon section schedule
  gradeLevel?: string // e.g. "5", "7", "11" — DepEd grade band
  sectionName?: string // e.g. "Rose", "Apple"
  classAdviserName?: string
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
  lrn?: string // 12-digit Learner Reference Number (unique when set)
  learnerStatus?: string // NEW | TRANSFEREE | CONTINUING
  houseNo?: string
  street?: string
  barangay?: string
  cityMunicipality?: string
  province?: string
  fatherName?: string
  motherName?: string
  guardianName?: string
  parentContact?: string
  motherTongue?: string
  religion?: string
  is4ps?: boolean
  isIp?: boolean
  dateEnrolled?: string // YYYY-MM-DD
  previousSchool?: string
  lastGradeCompleted?: string
  createdAt: number (timestamp)
}
```

---

## Rules

### classes

- `id` must be unique (UUID).
- `userId` is required — FK to `users.id`; all list/create/update scoped to authenticated teacher.
- `name` is required.
- `shift` is required: **`MRNG`** (morning section) or **`AFTNN`** (afternoon section).
- **Attendance UI:** when taking attendance for **AM**, only classes with **`shift = MRNG`** are offered; for **PM**, only **`shift = AFTNN`** (maps to `attendance_sessions.period` in [attendance.md](./attendance.md)).
- Do NOT embed students inside this object.

### students

- Each student belongs to ONE class.
- `classId` must reference an existing class **owned by the same teacher** (`classes.user_id`).
- Students have no direct `userId` column — ownership is via `classId` → `classes.user_id`.
- `firstName`, `lastName`, `birthDate`, and `gender` are required.
- Display name in UI: combine `firstName` + optional `middleName` + `lastName`.
- Do NOT store attendance or score data on this row.

### Class shift and roster rules

A class is identified by **`name` + `shift`**, not by `name` alone. The UI shows both (e.g. **Grade 6 · Morning (MRNG)**).

| Concept | Meaning |
|---------|---------|
| `name` | Grade or group label (e.g. `Grade 6`) |
| `shift` | Which **section** this roster belongs to for daily attendance |
| `MRNG` | Morning **section** — roster appears in **AM** attendance only |
| `AFTNN` | Afternoon **section** — roster appears in **PM** attendance only |

**Intended model**

- **One real section = one class row** with the correct `shift`.
- **MRNG and AFTNN are different sections** (usually different students), not two copies of the same class.
- Example: `Grade 6` + `MRNG` holds the morning-section Grade 6 roster; `Grade 6` + `AFTNN` holds the afternoon-section Grade 6 roster — only when those are **different children**.

**Do not mirror the same roster**

- Do **not** create both `Grade 6 · MRNG` and `Grade 6 · AFTNN` and import the **same** student list into both unless they are genuinely different afternoon-section pupils.
- Importing or re-entering the same children in both classes creates **two separate student rows** (two UUIDs), not one student linked to two classes.
- Effects: split AM/PM attendance, inflated headcount, duplicate Student Lab profiles, scores recorded on the wrong duplicate.

**Full-day single cohort**

- If one group attends **all day** and you take attendance morning **and** afternoon for the **same** kids, a single class with one `shift` only appears in **either** AM **or** PM attendance (see [attendance.md](./attendance.md)). Do not work around this by duplicating the class under the other shift.
- A product change (e.g. one class in both periods) would be a future extension — not supported today.

**Naming**

- Keep `name` as the grade label only (`Grade 6`). Use `shift` for morning vs afternoon; do not also embed “Morning” in `name` when `shift` is already `MRNG`.

**What the database enforces today**

| Rule | Enforced? |
|------|-----------|
| One `classId` per student row | Yes (column model) |
| `UNIQUE(name, shift)` on classes | **No** — duplicate class rows are allowed |
| Same person in two classes (e.g. name + birth date) | **No** — each register/import always inserts a new student row |
| Cross-class duplicate warning in UI | **No** |

See [Classes-Function-Doc.md](../documentation/Classes-Function-Doc.md) for teacher-facing flows and [attendance.md](./attendance.md) for AM/PM filtering.

---

## school_settings

DepEd form headers — see [deped-forms.md](./deped-forms.md).

```
school_settings: {
  id: string (uuid, primary key)
  schoolName: string
  schoolId: string // BEIS
  district: string
  division: string
  region: string
  schoolAddress?: string
  schoolHeadName?: string
  defaultSchoolYearId?: string
  updatedAt: number (timestamp)
}
```

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
- `idx_classes_user_id` on `classes(user_id)`.
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

- Prefer **one student row per real child** in exactly **one** class.
- Do NOT store nested objects in tables.
- **Not enforced in API today:** global deduplication by identity (e.g. `firstName` + `lastName` + `birthDate`), or blocking duplicate `(name, shift)` classes. See **Class shift and roster rules** above.

---

## Anti-patterns

- Embedding students inside class.
- Storing attendance or scores on `students` or `classes` without normalized child tables.
- Using arrays as primary storage.
- Creating **Grade X · MRNG** and **Grade X · AFTNN** with the **same** roster (duplicate student records).
- Putting “Morning” / “Afternoon” in `name` while also setting `shift` (redundant; confuses which field is authoritative).
- Using a second class under the other `shift` so one full-day cohort appears in both AM and PM attendance.

---

## Future extensions

Do not implement yet:

- Selective client-side caching or sync for roster data.
- `UNIQUE(name, shift)` on `classes` (or school-scoped equivalent).
- Cross-class student identity check on register/import (warn or reject duplicates).
- One class roster eligible for both AM and PM attendance (full-day cohort model).

**DepEd report generation** — shipped; see [deped-forms.md](./deped-forms.md), [DepEd-School-Forms-Function-Doc.md](../documentation/DepEd-School-Forms-Function-Doc.md).

**Student Lab** (shipped separately): read-only aggregation of roster + attendance + scores — see [student-lab.md](./student-lab.md).

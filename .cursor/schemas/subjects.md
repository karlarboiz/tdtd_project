# Subjects schema — catalog, school year, class assignment

## Purpose

Defines how a teacher registers **which subjects they handle** for a **school year**, maintains a reusable **subject catalog**, and links subjects to **classes** before quiz/exam/participation scoring.

Depends on [core.md](./core.md) (`classes`). Used by [quiz.md](./quiz.md) (`score_events`, `score_entries`).

---

## Tables

### school_years

Represents one academic year (e.g. Philippine SY **2025-2026**).

```
school_years: {
  id: string (uuid, primary key)
  userId: string // FK → users.id — owning teacher (GAP-001)
  label: string // required, e.g. "2025-2026"
  startDate?: string // "YYYY-MM-DD", optional
  endDate?: string // "YYYY-MM-DD", optional
  isActive: boolean // at most one true per teacher; drives default SY in UI
  createdAt: number (timestamp)
  updatedAt?: number (timestamp, optional)
}
```

### subjects

Reusable subject catalog per teacher (not tied to a single class or year).

```
subjects: {
  id: string (uuid, primary key)
  userId: string // FK → users.id — owning teacher (GAP-001)
  name: string // display name, required, trimmed in API
  shortCode?: string // optional, e.g. "MATH"
  createdAt: number (timestamp)
  updatedAt?: number (timestamp, optional)
}
```

### school_year_subjects

Teacher’s registration: subjects they will handle for a given school year.

```
school_year_subjects: {
  id: string (uuid, primary key)
  schoolYearId: string // FK → school_years.id
  subjectId: string // FK → subjects.id
  gradeLevel: string // required, e.g. "Grade 5", "6", "Kinder"
  createdAt: number (timestamp)
}
```

### class_subjects

Subjects assigned to a class (for score entry UI: pick class → subject).

```
class_subjects: {
  id: string (uuid, primary key)
  classId: string // FK → classes.id
  subjectId: string // FK → subjects.id
  createdAt: number (timestamp)
}
```

---

## Rules

### school_years

- `label` is required; trim whitespace; recommend format `YYYY-YYYY` (e.g. `2025-2026`).
- **MVP:** at most **one** row with `isActive = true` (enforce in API).
- Do not embed subjects or classes on this row.

### subjects

- `name` is required.
- Do not embed classes, students, or school years.
- **`name`:** unique per deployment, **case-insensitive** (enforced in API; DB unique index when no legacy duplicates).
- **`shortCode`:** when present, unique per deployment, **case-insensitive** (enforced in API; partial unique index when no legacy duplicates).
- Registration by `name` **reuses** an existing catalog row (same name, different `gradeLevel` allowed on `school_year_subjects`).

### school_year_subjects

- `gradeLevel` is required (trimmed in API).
- **Unique** `(schoolYearId, subjectId, gradeLevel)` — same catalog subject may be registered once per grade per SY.
- Both FKs must exist.
- Removing a registration SHOULD be blocked if `class_subjects` or `score_events` still reference that `subjectId` (default: **block delete**).

### class_subjects

- **Unique** `(classId, subjectId)`.
- **Enforced in API:** `subjectId` must appear in `school_year_subjects` for the **active** school year before assignment is allowed.
- Creating a `score_event` for `(classId, subjectId)` requires an existing `class_subjects` row (see [quiz.md](./quiz.md)).

---

## Relationships

```
school_years
└── school_year_subjects → subjects

classes (core.md)
└── class_subjects → subjects
         └── score_events → score_entries (quiz.md)
```

---

## Business logic

### School year setup (MVP)

1. Create or select a **school year** (set `isActive` when starting the year).
2. **Register subjects** for that year: pick existing catalog entries or create new `subjects`, then insert `school_year_subjects`.
3. For each **class**, assign subjects via **class_subjects** (subset of registered subjects for the active year).

### Registration flow (UI intent)

- Screen: “Subjects for [SY label]” (`/subjects`)
- Actions: add subject manually (modal), import from Excel, remove registration (if unused)

- Excel import (**row 1 = headers**):
  - Required columns: **Name**, **Grade Level** (synonyms: Grade, Level)
  - Optional column: **Short Code** (synonyms: Code, Abbreviation)
  - Ignore completely empty rows; trim whitespace
  - Sample file: `tdtd-frontend/src/lib/subjectImportSampleXlsx.ts`

### Data integrity

- Do not store subject names on `classes` or `students`.
- Do not nest `class_subjects` inside `school_years`.
- Score data stays in [quiz.md](./quiz.md) tables only.

---

## Indexes

See `tdtd-node/src/db/migrate.ts`:

- `school_years`: PK on `id`; partial unique on active year enforced in API.
- `subjects`: PK; `idx_subjects_name` on `name` (case-insensitive).
- `school_year_subjects`: **UNIQUE** `(school_year_id, subject_id, grade_level)`; indexes on `school_year_id`, `subject_id`.
- `class_subjects`: **UNIQUE** `(class_id, subject_id)`; indexes on `class_id`, `subject_id`.

---

## API expectations

- `GET/POST /api/school-years` — list, create.
- `PATCH /api/school-years/:schoolYearId/active` — set active year (clears others).
- `GET /api/school-years/active` — current active year or 404.
- `GET/POST /api/school-years/:schoolYearId/subjects` — list registrations (with subject details), register by `subjectId` or create+register via `name` / `shortCode`.
- `DELETE /api/school-years/:schoolYearId/subjects/:registrationId` — unregister by registration row id (if allowed).
- `GET/POST /api/subjects` — catalog list, create.
- `GET/POST/DELETE /api/classes/:classId/subjects` — class assignment (requires active-year registration).

---

## Anti-patterns

- Storing school year only as a string on `subjects` without `school_years` / `school_year_subjects`.
- Assigning a subject to a class without registering it for the active school year.
- Duplicating subject catalog rows per class instead of `class_subjects`.
- Putting quiz scores on `subjects` or `school_year_subjects`.

---

## Migration note

- **Existing DBs:** `migrateSchoolYearTables` adds `school_years` and `school_year_subjects`, then backfills one default active year and registers all existing catalog / assignment / score subjects.

---

## Future extensions (do not implement yet)

- DepEd standard subject codes.
- Archiving prior school years (read-only scores).

**Per-teacher ownership (GAP-001):** shipped — `userId` on `subjects` and `school_years`; see [GAP-001.md](../gaps/GAP-001.md).

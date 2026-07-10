# Quiz / scores schema

## Purpose

Defines recording **quiz**, **exam**, and **participation** scores. Scores are always in the context of a **class** and a **subject**.

Depends on [core.md](./core.md) (`classes`, `students`) and [subjects.md](./subjects.md) (`subjects`, `class_subjects`). Do not embed score data on `students` or `classes` rows.

**Ownership (GAP-001):** `score_events` and `score_entries` are scoped via `score_events.class_id` → `classes.user_id`. See [GAP-001.md](../gaps/GAP-001.md).

---

## Tables

### score_events

One assessment instance for a **single class and subject**.

```
score_events: {
  id: string (uuid, primary key)
  classId: string // FK → classes.id
  subjectId: string // FK → subjects.id
  kind: string // "QUIZ" | "EXAM" | "PARTICIPATION"
  quarter?: number // 1–4 (DepEd quarter)
  assessmentBucket?: string // "WW" | "PT" | "QA"
  title: string // e.g. "Quarter 2 Long Test"
  date?: string // "YYYY-MM-DD", optional
  maxScore?: number // optional ceiling for validation / UI
  createdAt: number (timestamp)
  updatedAt?: number (timestamp, optional)
}
```

### score_entries

Per-student value for one `score_event`.

```
score_entries: {
  id: string (uuid, primary key)
  eventId: string // FK → score_events.id
  studentId: string // FK → students.id
  score?: number // null = not recorded yet (draft)
  note?: string
  recordedAt: number (timestamp) // last write time for this row
}
```

---

## Rules

### score_events

- `kind` must be exactly **`QUIZ`**, **`EXAM`**, or **`PARTICIPATION`** (SQLite `CHECK`).
- `classId` and `subjectId` are both required.
- Do **not** use separate tables per kind; `kind` discriminates behavior in the app.
- Multiple events per day per class/subject/kind are allowed unless product adds stricter uniqueness.
- `maxScore`, when set: optional API validation `0 <= score <= maxScore` when `score` is not null.
- Creating a `score_event` requires an existing **`class_subjects`** row for `(classId, subjectId)` (enforce in API).

### score_entries

- **Unique** `(eventId, studentId)` — at most one entry per student per event.
- **Integrity:** student’s `classId` must equal `score_events.classId` for the same `eventId` (enforce in API).
- `score` nullable supports partial grading.
- Do not store arrays of scores in one row.

---

## Relationships

```
classes
├── students
├── class_subjects → subjects (subjects.md)
└── score_events → subjects
         └── score_entries → students
```

---

## Indexes

See `tdtd-node/src/db/migrate.ts`:

- `score_events`: index on `(class_id, subject_id)`; index on `(class_id, date)`; index on `subject_id`.
- `score_entries`: **UNIQUE** `(event_id, student_id)`; index on `student_id`.

---

## Business logic

### Recording flow

1. Register subjects for the active school year ([subjects.md](./subjects.md)).
2. Assign subjects to the class via **class_subjects**.
3. Teacher selects **class** → **subject** → **kind** (`QUIZ` / `EXAM` / `PARTICIPATION`).
4. Create a **score_event** (`title`, optional `date`, optional `maxScore`).
5. Load students for that **class**; upsert **score_entries** for the event.

---

## Anti-patterns

- Storing quiz/exam/participation totals on `students` or `classes` without normalized events.
- Omitting `subjectId` or `classId` from a score event.
- Using a free-form `kind` outside `QUIZ` | `EXAM` | `PARTICIPATION`.
- Nesting score rows inside JSON blobs as the primary store.

---

---

## computed_subject_grades

DepEd quarter/final grades — see [deped-grading.md](./deped-grading.md).

```
computed_subject_grades: {
  id: string (uuid, primary key)
  studentId: string
  subjectId: string
  classId: string
  schoolYearId: string
  quarter: number // 1–4, or 0 for final
  transmutedGrade?: number
  descriptor?: string
  finalGrade?: number
  manualOverride?: boolean
  computedAt: number (timestamp)
}
```

---

## Future extensions

Do not implement yet:

- Conduct/values grades on report cards.

**Weighted grading and DepEd report generation** — shipped; see [deped-grading.md](./deped-grading.md), [deped-forms.md](./deped-forms.md).

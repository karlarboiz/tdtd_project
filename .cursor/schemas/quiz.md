# Quiz / scores schema

## Purpose

Defines recording **quiz**, **exam**, and **participation** scores. Scores are always in the context of a **class** and a **subject**.

Depends on [core.md](./core.md) (`classes`, `students`). Do not embed score data on `students` or `classes` rows.

---

## Tables

### subjects

Reusable subject catalog (e.g. Mathematics, English).

```
subjects: {
  id: string (uuid, primary key)
  name: string // display name, required, trimmed in API
  shortCode?: string // optional short label (e.g. "MATH")
  createdAt: number (timestamp)
  updatedAt?: number (timestamp, optional)
}
```

### class_subjects

Junction: subjects assigned to a class (drives “pick subject for this class” in the UI).

```
class_subjects: {
  id: string (uuid, primary key)
  classId: string // FK → classes.id
  subjectId: string // FK → subjects.id
  createdAt: number (timestamp)
}
```

### score_events

One assessment instance for a **single class and subject**.

```
score_events: {
  id: string (uuid, primary key)
  classId: string // FK → classes.id
  subjectId: string // FK → subjects.id
  kind: string // "QUIZ" | "EXAM" | "PARTICIPATION"
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

### subjects

- `name` is required.
- Do not embed classes or students.
- Uniqueness of `name` / `shortCode` may be enforced in **API**; DB may omit global UNIQUE on `name` for flexible imports.
- `shortCode`, when present, should be unique per deployment (recommended API check).

### class_subjects

- **Unique** `(classId, subjectId)` — at most one row per pair.
- **Recommended:** creating a `score_event` for `(classId, subjectId)` SHOULD require an existing `class_subjects` row (enforce in API).
- Product choice for auto-create on first event vs strict assignment; default **strict:** assignment required first.

### score_events

- `kind` must be exactly **`QUIZ`**, **`EXAM`**, or **`PARTICIPATION`** (SQLite `CHECK`).
- `classId` and `subjectId` are both required.
- Do **not** use separate tables per kind; `kind` discriminates behavior in the app.
- Multiple events per day per class/subject/kind are allowed unless product adds stricter uniqueness.
- `maxScore`, when set: optional API validation `0 <= score <= maxScore` when `score` is not null.

### score_entries

- **Unique** `(eventId, studentId)` — at most one entry per student per event.
- **Integrity:** student’s `classId` must equal `score_events.classId` for the same `eventId` (enforce in API; SQLite needs triggers for DB-level check).
- `score` nullable supports partial grading.
- Do not store arrays of scores in one row.

---

## Relationships

```
classes
├── students
├── class_subjects → subjects
└── score_events → subjects
         └── score_entries → students
```

---

## Indexes

See `tdtd-node/src/db/migrate.ts`:

- `class_subjects`: index on `class_id`; index on `subject_id`; **UNIQUE** `(class_id, subject_id)`.
- `score_events`: index on `(class_id, subject_id)`; index on `(class_id, date)`; index on `subject_id`.
- `score_entries`: **UNIQUE** `(event_id, student_id)`; index on `student_id`.

---

## Business logic

### Recording flow

1. Ensure **subjects** exist (create or pick from list).
2. Assign subjects to the class via **class_subjects** (unless product explicitly auto-assigns).
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

## MVP variant (not recommended)

A single `subjects` table with nullable `classId` per row avoids `class_subjects` but duplicates subject names across classes and complicates reporting. Prefer **subjects + class_subjects**.

---

## Future extensions

Do not implement yet:

- Weighted grading / term averages (built on `score_events` + `score_entries`).
- DepEd report generation from normalized score history.

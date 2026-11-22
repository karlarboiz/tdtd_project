# Quiz / scores schema

## Purpose

Defines recording **quiz**, **exam**, and **participation** scores. Scores are always in the context of a **class** and a **subject**.

Depends on [core.md](./core.md) (`classes`, `students`) and [subjects.md](./subjects.md) (`subjects`, `class_subjects`). Do not embed score data on `students` or `classes` rows.

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
- Creating a `score_event` requires an existing **`class_subjects`** row for `(classId, subjectId)` (enforce in API). The same check applies when `subjectId` is changed.
- Deleting a `score_event` deletes its `score_entries` in the same transaction. Do not delete `students`, `classes`, or `subjects` as part of that delete.

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

### Updating and deleting an event

- `PATCH /api/score-events/:eventId` changes `title`, `date`, `kind`, and any other field the create path already accepts (`subjectId`, `maxScore`). Validation is the same as create. `kind` stays `QUIZ` | `EXAM` | `PARTICIPATION`. Fields omitted from the body stay as stored. `date` clears when sent as null or `""`. `maxScore` clears when sent as null. `classId` does not change. A successful change sets `updatedAt`.
- `DELETE /api/score-events/:eventId` deletes that event and its `score_entries` in one transaction. Entries are children of the event. Students, classes, and subjects stay.
- Each successful update or delete writes one activity row: `SCORE_EVENT_UPDATED` or `SCORE_EVENT_DELETED`. A logging failure does not roll back the mutation. See [recents.md](./recents.md).

---

## Anti-patterns

- Storing quiz/exam/participation totals on `students` or `classes` without normalized events.
- Omitting `subjectId` or `classId` from a score event.
- Using a free-form `kind` outside `QUIZ` | `EXAM` | `PARTICIPATION`.
- Nesting score rows inside JSON blobs as the primary store.

---

## Future extensions

Do not implement yet:

- Weighted grading / term averages (built on `score_events` + `score_entries`).
- DepEd report generation from normalized score history.

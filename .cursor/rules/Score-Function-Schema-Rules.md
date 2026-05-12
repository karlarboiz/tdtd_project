# Score-Function-Schema-Rules.md

## Purpose

This document defines the **official database schema and business rules** for recording **quiz**, **exam**, and **participation** scores in the Teacher Attendance App.

Scores are always recorded in the context of a **class** and a **subject**. It **extends** the core tables defined in [Schema-Rules.md](./Schema-Rules.md) (`classes`, `students`). Canonical storage remains **SQLite** in **tdtd-node**; the frontend uses the REST API only.

Do not embed score data on `students` or `classes` rows. Use the tables below.

---

## Tables overview

1. `subjects` — reusable subject catalog  
2. `class_subjects` — which subjects apply to which class  
3. `score_events` — one assessment instance (quiz / exam / participation) for a class + subject  
4. `score_entries` — one numeric (or null) score per student per event  

---

## 1. subjects

Represents a school subject (e.g. Mathematics, English).

### Structure

```
subjects: {
  id: string (uuid, primary key)
  name: string // display name, required, trimmed in API
  shortCode?: string // optional short label (e.g. "MATH")
  createdAt: number (timestamp)
  updatedAt?: number (timestamp, optional)
}
```

### Rules

- `name` is required.  
- Do not embed classes or students.  
- Uniqueness of `name` / `shortCode` is enforced in **API** if desired; the database may omit a global UNIQUE on `name` to allow flexible imports.  
- `shortCode`, when present, should be unique per deployment (recommended API check).

---

## 2. class_subjects

Junction: subjects assigned to a class (drives “pick subject for this class” in the UI).

### Structure

```
class_subjects: {
  id: string (uuid, primary key)
  classId: string // FK → classes.id
  subjectId: string // FK → subjects.id
  createdAt: number (timestamp)
}
```

### Rules

- **Unique** `(classId, subjectId)` — at most one row per pair.  
- **Recommended:** creating a `score_event` for `(classId, subjectId)` SHOULD require an existing `class_subjects` row for that pair (enforce in API).  
- API may auto-create junction rows when creating the first score event, or require explicit assignment first — product choice; default **strict:** assignment required first.

---

## 3. score_events

One recorded assessment activity: a quiz, an exam, or a participation grade set for a **single class and subject**.

### Structure

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

### Rules

- `kind` must be exactly **`QUIZ`**, **`EXAM`**, or **`PARTICIPATION`** (SQLite `CHECK`).  
- `classId` and `subjectId` are both required.  
- Do **not** use separate tables per kind; `kind` discriminates behavior in the app.  
- Multiple events per day per class/subject/kind are allowed unless product adds a stricter uniqueness rule.  
- `maxScore`, when set, is used by the API for optional validation: `score` should satisfy `0 <= score <= maxScore` when `score` is not null.

---

## 4. score_entries

Per-student value for one `score_event`.

### Structure

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

### Rules

- **Unique** `(eventId, studentId)` — at most one entry per student per event.  
- **Integrity:** the student’s `classId` must equal `score_events.classId` for the same `eventId`. Enforce in **API** (recommended); SQLite does not express this without triggers.  
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

## Required indexes (SQLite)

- `class_subjects`: index on `class_id`; index on `subject_id`; **UNIQUE** `(class_id, subject_id)`.  
- `score_events`: index on `(class_id, subject_id)`; index on `(class_id, date)` where `date` is used; index on `subject_id` as needed for reports.  
- `score_entries`: **UNIQUE** `(event_id, student_id)`; index on `student_id` for history by student.

See `tdtd-node/src/db/migrate.ts` for DDL aligned with this document.

---

## Business logic (recording flow)

1. Ensure **subjects** exist (create or pick from list).  
2. Assign subjects to the class via **class_subjects** (unless product explicitly auto-assigns).  
3. Teacher selects **class** → **subject** → **kind** (`QUIZ` / `EXAM` / `PARTICIPATION`).  
4. Create a **score_event** (`title`, optional `date`, optional `maxScore`).  
5. Load students for that **class**; upsert **score_entries** for the event.

---

## API expectations (summary)

- Subjects: list/create under `/api/subjects` (or equivalent).  
- Class–subject links: under `/api/classes/:classId/subjects`.  
- Events: create/list under `/api/classes/:classId/score-events` (optional `subjectId` query for list filter).  
- Entries: get/replace under `/api/score-events/:eventId/entries` (bulk upsert).

Exact paths live in `tdtd-node/src/app.ts` and route modules.

---

## Anti-patterns (forbidden)

- Storing quiz/exam/participation totals on `students` or `classes` without normalized events.  
- Omitting `subjectId` or `classId` from a score event.  
- Using a free-form `kind` string outside the three allowed values.  
- Nesting score rows inside JSON blobs as the primary store.

---

## MVP variant (not recommended)

A single `subjects` table with a nullable `classId` on each subject row avoids `class_subjects` but duplicates subject names across classes and complicates cross-class reporting. Prefer **subjects + class_subjects** above.

---

## Design principles

- Flat, relational tables; header (`score_events`) + lines (`score_entries`), analogous to attendance session + records.  
- Same backend-first rules as [Schema-Rules.md](./Schema-Rules.md): single source of truth in SQLite, REST for the client.

---

## Final note

Any generated code for scores **must** match this document and stay consistent with [Schema-Rules.md](./Schema-Rules.md) for shared entities (`classes`, `students`).

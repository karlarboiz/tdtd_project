# Score-Function-Schema-Rules.md

## Purpose

Agent index for **quiz**, **exam**, and **participation** scores in **Teacher's Dilemma Today**.

Score tables: [quiz.md](../schemas/quiz.md). Subjects / class assignment: [subjects.md](../schemas/subjects.md). Shared entities (`classes`, `students`): [core.md](../schemas/core.md). Architecture: [Schema-Rules.md](./Schema-Rules.md) and [schemas/README.md](../schemas/README.md).

Do not embed score data on `students` or `classes` rows.

Function change log: [Quiz-Function-Doc.md](../documentation/Quiz-Function-Doc.md), [Subject-Function-Doc.md](../documentation/Subject-Function-Doc.md).

---

## Tables overview

| # | Table | Schema doc |
|---|--------|------------|
| 1 | `subjects`, `class_subjects`, `school_years`, `school_year_subjects` | [subjects.md](../schemas/subjects.md) |
| 2 | `score_events` | [quiz.md](../schemas/quiz.md) |
| 3 | `score_entries` | [quiz.md](../schemas/quiz.md) |

Field-level rules: [quiz.md](../schemas/quiz.md), [subjects.md](../schemas/subjects.md). DDL: `tdtd-node/src/db/migrate.ts`.

---

## API expectations (summary)

- **Subjects:** list/create under `/api/subjects` (or equivalent).
- **Class–subject links:** `/api/classes/:classId/subjects`.
- **Events:** create/list under `/api/classes/:classId/score-events` (optional `subjectId` query filter).
- **Entries:** get/replace under `/api/score-events/:eventId/entries` (bulk upsert).

Exact paths: `tdtd-node/src/app.ts` and route modules.

---

## Design principles

- Flat, relational tables: header (`score_events`) + lines (`score_entries`), analogous to attendance session + records.
- Backend-first: SQLite in **tdtd-node**, REST for the client ([Schema-Rules.md](./Schema-Rules.md)).

---

## Anti-patterns

See [quiz.md](../schemas/quiz.md). In short:

- Totals on `students` / `classes` without normalized events.
- Missing `classId` or `subjectId` on score events.
- `kind` values outside `QUIZ` | `EXAM` | `PARTICIPATION`.
- JSON blobs as the primary score store.

---

## Final note

Generated code for scores **must** match [quiz.md](../schemas/quiz.md) and [subjects.md](../schemas/subjects.md), and stay consistent with [core.md](../schemas/core.md).

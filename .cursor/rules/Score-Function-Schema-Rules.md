# Score-Function-Schema-Rules.md

## Purpose

Agent index for **quiz**, **exam**, and **participation** scores in **Teacher's Dilemma Today**.

Canonical table definitions: [quiz.md](../schemas/quiz.md). Shared entities (`classes`, `students`): [core.md](../schemas/core.md). Architecture and DB setup: [Schema-Rules.md](./Schema-Rules.md) and [schemas/README.md](../schemas/README.md).

Do not embed score data on `students` or `classes` rows. Use the tables in [quiz.md](../schemas/quiz.md).

---

## Tables overview

| # | Table | Role |
|---|--------|------|
| 1 | `subjects` | Reusable subject catalog |
| 2 | `class_subjects` | Subjects assigned to a class |
| 3 | `score_events` | One assessment (QUIZ \| EXAM \| PARTICIPATION) per class + subject |
| 4 | `score_entries` | One score per student per event |

Field-level rules, indexes, and flows: [quiz.md](../schemas/quiz.md). DDL: `tdtd-node/src/db/migrate.ts`.

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

Generated code for scores **must** match [quiz.md](../schemas/quiz.md) and stay consistent with [core.md](../schemas/core.md) for `classes` and `students`.

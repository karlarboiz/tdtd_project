# Quiz / scores — function documentation

**Quiz**, **exam**, and **participation** scoring via normalized events and per-student entries. UI labels this area “Scores”; storage uses `score_events` and `score_entries`.

**Canonical schema:** [quiz.md](../schemas/quiz.md) · **Prerequisites:** [subjects.md](../schemas/subjects.md), [core.md](../schemas/core.md)

## API overview

| Area | Base path | Notes |
|------|-----------|--------|
| Class subjects | `/api/classes/:classId/subjects` | Required before creating events |
| Score events | `/api/classes/:classId/score-events` | Optional `?subjectId=` filter |
| Event detail | `/api/score-events/:eventId` | GET single event |
| Entries | `/api/score-events/:eventId/entries` | GET list; PUT bulk upsert |

`kind` must be `QUIZ` | `EXAM` | `PARTICIPATION`. Creating an event requires an existing `class_subjects` row and active-year subject registration.

---

## Entry QUIZ-003 — Scores UI: list events, create event, grade roster

**Date:** 2026-05-21

**Summary:** Frontend pages for managing score events and entering grades; client API module; shared score labels/constants; backend GET event by id.

**Reason:** Backend score APIs existed without a teacher-facing flow to create assessments and record per-student scores.

**What changed:**
- **`/scores` page:** Pick class → subject → kind (quiz/exam/participation) → subtype/title → create event; list events for class.
- **`/scores/event/:eventId` page:** Load roster for event’s class; edit scores and notes; bulk save entries.
- **Frontend API:** `scoreApi.ts` — class subjects, events, entries, save.
- **UX helpers:** `scoreLabels.ts`, `TDTDConstants.ts` (kinds and subtype codes).
- **Backend:** `GET /api/score-events/:eventId`; routes wired in `scoreEvent.routes.ts`.
- **Navigation:** Home and `AppShell` links to Scores.

**Files involved:**
- `tdtd-frontend/src/pages/Scores/Scores.tsx`
- `tdtd-frontend/src/pages/ScoreGrading/ScoreGrading.tsx`
- `tdtd-frontend/src/api/scoreApi.ts`
- `tdtd-frontend/src/lib/scoreLabels.ts`
- `tdtd-frontend/src/constants/TDTDConstants.ts`
- `tdtd-frontend/src/App.tsx`
- `tdtd-frontend/src/layouts/AppShell.tsx`
- `tdtd-frontend/src/pages/Home/Home.tsx`
- `tdtd-node/src/routes/scoreEvent.routes.ts`
- `tdtd-node/src/controllers/score.controller.ts`
- `tdtd-node/src/services/score.service.ts`
- `tdtd-node/src/constants/TDTDConstants.ts`

**Schemas involved:**
- [quiz.md](../schemas/quiz.md) — `score_events`, `score_entries`
- [subjects.md](../schemas/subjects.md) — `class_subjects` (subject must be assigned to class)
- [core.md](../schemas/core.md) — students scoped by `classId`

---

## Entry QUIZ-002 — Quiz schema docs and agent index split

**Date:** 2026-05-20

**Summary:** Canonical quiz/score schema documented under `.cursor/schemas/quiz.md`; score rules file slimmed to an index.

**Reason:** Same documentation strategy as attendance — schema truth in `schemas/`, function history in `documentation/`.

**What changed:**
- Added [quiz.md](../schemas/quiz.md) with events, entries, integrity rules, recording flow.
- Updated [Score-Function-Schema-Rules.md](../rules/Score-Function-Schema-Rules.md) to link to schema files.

**Files involved:**
- `.cursor/schemas/quiz.md`
- `.cursor/schemas/README.md`
- `.cursor/rules/Score-Function-Schema-Rules.md`

**Schemas involved:**
- [quiz.md](../schemas/quiz.md)
- [subjects.md](../schemas/subjects.md) (cross-references)

---

## Entry QUIZ-001 — Score backend: DDL, DAOs, REST, types

**Date:** 2026-05-13

**Summary:** SQLite tables and full REST stack for subjects catalog, class–subject assignment, score events, and score entry upserts.

**Reason:** Teachers need structured quiz/exam/participation history per class and subject, not ad hoc fields on student rows.

**What changed:**
- **DDL:** `subjects`, `class_subjects`, `score_events`, `score_entries` in `migrate.ts` (with indexes and CHECK on `kind`).
- **Subjects API:** `GET/POST /api/subjects`.
- **Class API:** assign/list/remove `/api/classes/:classId/subjects`; create/list `/api/classes/:classId/score-events`.
- **Entries API:** `GET/PUT /api/score-events/:eventId/entries` (bulk upsert, nullable scores for drafts).
- **Validation:** `kind` enum; student `classId` must match event; `class_subjects` required before event create.
- **Types:** Node `schema/types.ts` and frontend `types/schema.ts` mirrored for score entities.
- **Agent spec:** [Score-Function-Schema-Rules.md](../rules/Score-Function-Schema-Rules.md) introduced.

**Files involved:**
- `tdtd-node/src/db/migrate.ts`
- `tdtd-node/src/dao/subject.dao.ts`, `classSubject.dao.ts`, `scoreEvent.dao.ts`, `scoreEntry.dao.ts`
- `tdtd-node/src/queries/subject.queries.ts`, `classSubject.queries.ts`, `scoreEntry.queries.ts`, `scoreEvent.queries.ts`
- `tdtd-node/src/services/subject.service.ts`, `score.service.ts`
- `tdtd-node/src/controllers/score.controller.ts`, `subject.controller.ts`
- `tdtd-node/src/routes/subject.routes.ts`, `class.routes.ts`, `scoreEvent.routes.ts`
- `tdtd-node/src/app.ts`
- `tdtd-node/src/schema/types.ts`, `constants.ts`, `index.ts`
- `tdtd-frontend/src/types/schema.ts`
- `.cursor/rules/Score-Function-Schema-Rules.md`

**Schemas involved:**
- [quiz.md](../schemas/quiz.md) — `score_events`, `score_entries` (rules later formalized in QUIZ-002)
- [subjects.md](../schemas/subjects.md) — `subjects`, `class_subjects`
- [core.md](../schemas/core.md) — `classes`, `students`

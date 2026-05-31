# Student Lab — function documentation

Per-student **read-only** dashboard: profile, shift-aware attendance (summary + session list), and date-filtered recent quiz, exam, and participation scores.

**Canonical contract:** [student-lab.md](../schemas/student-lab.md) (read model; **no new tables**)

**Data sources:** [core.md](../schemas/core.md) · [attendance.md](../schemas/attendance.md) · [quiz.md](../schemas/quiz.md) · [subjects.md](../schemas/subjects.md)

## API overview

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/students/:studentId` | Student + class for header |
| GET | `/api/students/:studentId/lab?from=&to=&scoresFrom=&scoresTo=` | Aggregated lab payload |

**UI routes:** `/student-lab` (picker), `/student-lab/:studentId` (detail)

**Entry points:** App nav **Student Lab**; clickable student rows on `/classes`.

---

## Entry LAB-001 — Student Lab v1 (view-only dashboard)

**Date:** 2026-05-26

**Summary:** Add Student Lab picker and detail pages with backend aggregation APIs; attendance summary + session list (30-day default, all-time toggle); scores grouped by kind with date-window presets; deep links to existing attendance session and score grading pages.

**Reason:** Teachers work class- and event-centric today (Classes, Attendance, Scores). A single student view surfaces profile, attendance pattern, and recent assessments without hunting across screens.

**What changed:**

- **Schema doc:** [student-lab.md](../schemas/student-lab.md) — API contract, aggregation rules, response types (no DDL).
- **Backend:**
  - `GET /api/students/:studentId` — student + class; 404 when missing.
  - `GET /api/students/:studentId/lab` — profile, shift-aware attendance (`from`/`to` optional for all-time), scores split by kind (`scoresFrom`/`scoresTo`).
  - New module: queries, dao, service, controller; extend student routes.
- **Frontend:**
  - `/student-lab` — `StudentLabPicker` (class select + student list).
  - `/student-lab/:studentId` — `StudentLab` detail (profile card, attendance toggle Last 30 days / All time, score presets Last 30 / 90 / active school year).
  - `studentLabApi.ts`, `studentLabRoute.ts`, types on `StudentLabPayload` and row types.
  - Nav: **Student Lab** in `AppShell`; **Student Lab shortcut** card on Home (see [Home-Page-Doc.md](./Home-Page-Doc.md)).
  - **Classes:** roster rows link to student lab.
- **v1 scope:** View-only; edits via `/attendance/session/...` and `/scores/event/...`.

**Files involved:**

- `.cursor/schemas/student-lab.md`
- `.cursor/schemas/README.md`
- `.cursor/documentation/Student-Lab-Function-Doc.md`
- `.cursor/documentation/README.md`
- `tdtd-node/src/queries/studentLab.queries.ts`
- `tdtd-node/src/dao/studentLab.dao.ts`
- `tdtd-node/src/services/studentLab.service.ts`
- `tdtd-node/src/controllers/studentLab.controller.ts`
- `tdtd-node/src/routes/student.routes.ts`
- `tdtd-node/src/schema/types.ts`
- `tdtd-frontend/src/api/studentLabApi.ts`
- `tdtd-frontend/src/lib/studentLabRoute.ts`
- `tdtd-frontend/src/pages/StudentLabPicker/StudentLabPicker.tsx`
- `tdtd-frontend/src/pages/StudentLab/StudentLab.tsx`
- `tdtd-frontend/src/types/schema.ts`
- `tdtd-frontend/src/App.tsx`
- `tdtd-frontend/src/layouts/AppShell.tsx`
- `tdtd-frontend/src/pages/Home/Home.tsx`
- `tdtd-frontend/src/pages/Classes/Classes.tsx`

**Schemas involved:**

- [student-lab.md](../schemas/student-lab.md) — read model / API
- [core.md](../schemas/core.md) — `students`, `classes.shift`
- [attendance.md](../schemas/attendance.md) — sessions and present records
- [quiz.md](../schemas/quiz.md) — `score_events`, `score_entries`
- [subjects.md](../schemas/subjects.md) — subject display names on score rows

**Manual test checklist:**

- Open lab from nav picker and from Classes — same data.
- 30-day attendance summary matches session list counts.
- All-time toggle expands sessions and recalculates summary.
- Score presets (30 / 90 / school year) change only score sections.
- Attendance row opens correct AM/PM session; score row opens grading page.
- Unknown student id → 404.
- MRNG class student: PM sessions excluded from absent count.

# Subjects — function documentation

Subject **catalog**, **school year** setup, per-year **registration** (with grade level), and **class–subject** assignment. Required before score events (see [Quiz-Function-Doc.md](./Quiz-Function-Doc.md)).

**Canonical schema:** [subjects.md](../schemas/subjects.md) · **Shared:** [core.md](../schemas/core.md)

## API overview

| Area | Path |
|------|------|
| School years | `GET/POST /api/school-years`, `GET /active`, `PATCH /:id/active` |
| SY registrations | `GET/POST /api/school-years/:schoolYearId/subjects`, `DELETE .../:registrationId` |
| Catalog | `GET/POST /api/subjects` |
| Class assignment | `GET/POST/DELETE /api/classes/:classId/subjects` |

**Data ownership (GAP-001):** Subject catalog and school years are per-teacher (`user_id`). Each teacher maintains their own catalog and active school year. See [GAP-001.md](../gaps/GAP-001.md).

---

## Entry SUB-004 — Filter registered subjects by grade level

**Date:** 2026-05-26

**Summary:** Subjects page adds a grade-level filter on the registered-subjects table (all levels or one grade).

**Reason:** School years can register many subjects across grades; teachers need to narrow the list when reviewing or removing registrations.

**What changed:**
- **Filter control** on `/subjects`: “All grade levels” or a specific `gradeLevel` from current registrations.
- **Filtered table** and empty-state copy when a grade has no rows.
- Filter resets to **all** if the selected grade disappears (e.g. after removing the last subject in that grade).

**Files involved:**
- `tdtd-frontend/src/pages/Subjects/Subjects.tsx`

**Schemas involved:**
- [subjects.md](../schemas/subjects.md) — `school_year_subjects.grade_level` (display/filter only)

---

## Entry SUB-003 — Subject schema doc and registration `grade_level`

**Date:** 2026-05-20

**Summary:** Expanded [subjects.md](../schemas/subjects.md) for school years and registrations; migration adds `grade_level` to legacy `school_year_subjects` rows.

**Reason:** Document the full subject/school-year model in one canonical file; upgrade DBs created before grade level was required.

**What changed:**
- Schema doc covers `school_years`, `school_year_subjects`, import rules, API expectations.
- `migrateSchoolYearSubjectsGradeLevel` backfills `'Unspecified'` for old rows.

**Files involved:**
- `.cursor/schemas/subjects.md`
- `.cursor/schemas/README.md`
- `tdtd-node/src/db/migrate.ts`

**Schemas involved:**
- [subjects.md](../schemas/subjects.md)

---

## Entry SUB-002 — School year registration, Subjects UI, duplicate checks

**Date:** 2026-05-21

**Summary:** School year tables and API; `/subjects` page for active-year registrations; Excel import; case-insensitive duplicate checks on catalog name and short code.

**Reason:** Teachers teach specific subjects per **school year** and grade level; scoring and class assignment must respect the **active** year only.

**What changed:**
- **DDL:** `school_years`, `school_year_subjects`; backfill one active year and registrations for existing subjects/assignments/scores.
- **School year API:** create, list, get active, activate; register/unregister subjects per year with `gradeLevel`.
- **Registration rules:** Reuse catalog subject by name (case-insensitive); unique `(schoolYearId, subjectId, gradeLevel)`; block unregister if class or score references exist.
- **Class assign:** `assignSubjectToClass` requires subject registered for active year (`assertSubjectRegisteredForActiveYear`).
- **Catalog:** `createSubject` and registration paths reject duplicate `name` / `shortCode` (409).
- **Unique indexes:** partial unique on `subjects.name` and `subjects.short_code` when no legacy duplicates.
- **Frontend:** `/subjects` page — setup active year, add via modal, Excel import (Name, Grade Level, optional Short Code), remove registration.
- **Libs:** `schoolYearApi.ts`, `subjectImportParse.ts`, `subjectImportSampleXlsx.ts`, `schoolYearLabel.ts`, `AddSubjectModal`.

**Files involved:**
- `tdtd-node/src/db/migrate.ts` — `migrateSchoolYearTables`, grade level migration, unique indexes
- `tdtd-node/src/dao/schoolYear.dao.ts`
- `tdtd-node/src/queries/schoolYear.queries.ts`
- `tdtd-node/src/services/schoolYear.service.ts`
- `tdtd-node/src/controllers/schoolYear.controller.ts`
- `tdtd-node/src/routes/schoolYear.routes.ts`
- `tdtd-node/src/services/subject.service.ts` — duplicates, `resolveSubjectIdForRegistration`
- `tdtd-node/src/services/score.service.ts` — active-year guard on assign/event
- `tdtd-node/src/dao/subject.dao.ts`, `queries/subject.queries.ts`
- `tdtd-node/src/app.ts` — `/api/school-years`
- `tdtd-node/src/schema/types.ts`, `constants.ts`, `index.ts`
- `tdtd-frontend/src/api/schoolYearApi.ts`
- `tdtd-frontend/src/pages/Subjects/Subjects.tsx`
- `tdtd-frontend/src/components/AddSubjectModal/AddSubjectModal.tsx`
- `tdtd-frontend/src/lib/subjectImportParse.ts`, `subjectImportSampleXlsx.ts`, `schoolYearLabel.ts`
- `tdtd-frontend/src/types/schema.ts`
- `tdtd-frontend/src/App.tsx`, `layouts/AppShell.tsx`, `pages/Home/Home.tsx`
- `.cursor/schemas/subjects.md`
- `.cursor/rules/Schema-Rules.md`, `Score-Function-Schema-Rules.md`

**Schemas involved:**
- [subjects.md](../schemas/subjects.md) — all four tables
- [quiz.md](../schemas/quiz.md) — score flows depend on `class_subjects` + registration

---

## Entry SUB-001 — Subject catalog and class–subject assignment (initial)

**Date:** 2026-05-13

**Summary:** Reusable `subjects` catalog and `class_subjects` links; basic list/create subject API; assignment endpoints on class router (shared commit with score backend).

**Reason:** Score events need a stable subject dimension and a per-class list of subjects before teachers can record quiz/exam/participation.

**What changed:**
- **DDL:** `subjects`, `class_subjects` with unique `(class_id, subject_id)`.
- **API:** `GET/POST /api/subjects`; class routes for list/assign/remove subjects.
- **Service:** Create subject with trimmed name; assign only if subject exists and class exists.
- **No school years yet** — catalog and class links only (SY layer added in SUB-002).

**Files involved:**
- `tdtd-node/src/db/migrate.ts`
- `tdtd-node/src/dao/subject.dao.ts`, `classSubject.dao.ts`
- `tdtd-node/src/queries/subject.queries.ts`, `classSubject.queries.ts`
- `tdtd-node/src/services/subject.service.ts`, `score.service.ts` (class subject + events)
- `tdtd-node/src/controllers/subject.controller.ts`, `score.controller.ts`
- `tdtd-node/src/routes/subject.routes.ts`, `class.routes.ts`
- `tdtd-node/src/schema/types.ts`
- `tdtd-frontend/src/types/schema.ts`
- `.cursor/rules/Score-Function-Schema-Rules.md` (initial subject tables in agent rules)

**Schemas involved:**
- [subjects.md](../schemas/subjects.md) — `subjects`, `class_subjects` (school year tables documented later)
- [core.md](../schemas/core.md) — `classes`

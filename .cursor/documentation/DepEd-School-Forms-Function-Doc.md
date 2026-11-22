# DepEd Official School Forms — function documentation

Phased implementation of DepEd-compliant **official school forms**: SF1, SF2, SF4, SF5, SF9, and SF10 — enrollment metadata, DepEd attendance codes, quarter-grade computation, and PDF/Excel export via **`tdtd-batch`**.

**Canonical schemas:** [deped-forms.md](../schemas/deped-forms.md) · [core.md](../schemas/core.md) · [attendance.md](../schemas/attendance.md) · [quiz.md](../schemas/quiz.md) · [deped-grading.md](../schemas/deped-grading.md)

**Related:** [Report-Generation-Function-Doc.md](./Report-Generation-Function-Doc.md) · [Gap-Backlog-Doc.md](./Gap-Backlog-Doc.md) P7 · [Spec-Align-Doc.md](./Spec-Align-Doc.md) §5

---

## Purpose and scope

**Compliance** in TDTD means **functionally complete field coverage** and **export-ready DepEd layouts** (PDF + Excel). It does **not** mean DepEd certification, BEIS upload, or pixel-perfect match to every form revision year.

| Form | DepEd purpose | TDTD target |
|------|---------------|-------------|
| **SF1** | School Register — master enrollment list | GAP-083, REP-004 |
| **SF2** | Daily Attendance Report of Learners | GAP-089, REP-006 |
| **SF4** | Monthly Learner's Attendance (class matrix) | GAP-097, REP-007 |
| **SF5** | Report on Promotion & Level of Proficiency | GAP-098, REP-010 |
| **SF9** | Learner's Progress Report Card | GAP-084, REP-008 |
| **SF10** | Learner's Permanent Academic Record | GAP-084, REP-009 |

---

## Architecture

```text
SQLite (teacher_app.sqlite)
  ├── school_settings, classes (+ grade/section), students (+ LRN, address, parents)
  ├── daily_attendance_records (DepEd status codes)
  ├── score_events (+ quarter, WW/PT/QA bucket), computed_subject_grades
  └── enrollment_history (multi-year SF10)
        │
        ▼
tdtd-node — CRUD, attendance save, grade computation, GET /api/reports/*
        │
        ▼
tdtd-batch — DepEdReportDao + Sf*ReportService (PDFBox + Apache POI)
        │
        ▼
data/reports/  (sf1-, sf2-, sf4-, sf5-, sf9-, sf10-*.pdf / .xlsx)
        │
        ▼
tdtd-frontend — Reports page, extended registration, attendance codes UI
```

**Report pattern:** Extend [AttendancePdfService](../../tdtd-batch/tdtd-batch-services/src/main/java/com/tdtd/batch/service/AttendancePdfService.java). v1: batch run-once env triggers. v2: [REP-002](./Report-Generation-Function-Doc.md) on-demand via `tdtd-node`.

---

## Form catalog and field mappings

Detailed column mappings: [deped-forms.md](../schemas/deped-forms.md).

### SF1 — School Register

| DepEd field | TDTD source |
|-------------|-------------|
| Region / Division / District / School | `school_settings` |
| School year | `school_years.label` |
| Grade & section | `classes.grade_level`, `classes.section_name` |
| LRN | `students.lrn` |
| Name (last, first, middle) | `students.*` |
| Sex, birth date, age | `students.gender`, `birth_date` (age computed) |
| Address | `students.house_no`, `street`, `barangay`, `city_municipality`, `province` |
| Father / Mother / Guardian | `students.father_name`, `mother_name`, `guardian_name` |
| Monthly attendance summary | `daily_attendance_records` rollups |

### SF2 — Daily Attendance Report

| DepEd field | TDTD source |
|-------------|-------------|
| School header | `school_settings` + class metadata |
| LRN, learner name | `students` |
| Daily marks (P/A/L/E) | `daily_attendance_records.status` per school day |
| Monthly totals | Aggregated from daily register |

### SF4 — Monthly Class Attendance

| DepEd field | TDTD source |
|-------------|-------------|
| Class M/F counts per day | `students.gender` + daily register |
| Absent / tardy / excused tallies | Status code counts |

### SF5 — Promotion Report

| DepEd field | TDTD source |
|-------------|-------------|
| Final grades per learning area | `computed_subject_grades.final_grade` |
| General average | Grade computation service |
| Action taken | `enrollment_history.promotion_status` |

### SF9 — Report Card

| DepEd field | TDTD source |
|-------------|-------------|
| Q1–Q4 grades per subject | `computed_subject_grades` by quarter |
| Descriptors | Transmutation + descriptor map ([deped-grading.md](../schemas/deped-grading.md)) |
| Attendance days | `daily_attendance_records` summary |
| Learner biodata | Extended `students` + `school_settings` |

### SF10 — Permanent Record

| DepEd field | TDTD source |
|-------------|-------------|
| LRN, cumulative biodata | `students` + `enrollment_history` |
| Grades by grade level / SY | `enrollment_history.grades_snapshot_json` |

---

## Backlog crosswalk (P7)

| ID | Title | Status |
|----|-------|--------|
| GAP-080 | Grading design: quarters, WW/PT/QA, transmutation | Schema doc shipped |
| GAP-081 | Map score_events to WW/PT/QA + quarter | Shipped |
| GAP-082 | Quarter grade computation API | Shipped |
| GAP-087 | School settings + enrollment schema | Shipped |
| GAP-088 | DepEd attendance codes + daily register | Shipped |
| GAP-089 | SF2 generation | Shipped |
| GAP-097 | SF4 generation | Shipped |
| GAP-083 | SF1 generation | Shipped |
| GAP-084 | SF9 / SF10 generation | Shipped |
| GAP-099 | Multi-year enrollment history | Shipped |
| GAP-098 | SF5 promotion report | Shipped |
| GAP-085 | Auto-fill report cards | Shipped |
| GAP-086 | DueList: quarter deadline | Shipped |

**Execution order:** GAP-080 → GAP-081 → GAP-082; GAP-087 ∥ GAP-088 → GAP-089 → GAP-097 → GAP-083 → GAP-084 + GAP-099 → GAP-098 → GAP-085 → GAP-086

---

## Implementation phases

| Phase | Deliverable | Milestone |
|-------|-------------|-----------|
| 0 | Design docs (`deped-grading.md`, `deped-forms.md`, schema updates) | M0 |
| 1 | GAP-087 enrollment + school metadata | M1 |
| 2 | GAP-088–089, GAP-097 attendance + SF2/SF4 | M2, M5 |
| 3 | GAP-081–082 grading engine | M3 |
| 4 | GAP-083–084, GAP-098–099 form exports | M4, M6 |
| 5 | GAP-085–086, REP-002 Reports UX | M7 |

---

## Entry log

### DEPED-001 — DepEd School Forms epic (plan + foundation)

**Date:** 2026-06-14

**Summary:** Document and implement DepEd official school forms epic: schema design, enrollment expansion, daily attendance codes, grading engine, SF1/SF2/SF4/SF5/SF9/SF10 batch export, and Reports UI.

**Reason:** Teachers need DepEd-compliant exports (SF1, SF2, SF4, SF5, SF9, SF10) for enrollment, attendance, grades, and promotion — currently missing per [Spec-Align-Doc.md](./Spec-Align-Doc.md) §5.

**What changed:**

- This function doc and [deped-forms.md](../schemas/deped-forms.md), [deped-grading.md](../schemas/deped-grading.md)
- Schema updates: [core.md](../schemas/core.md), [attendance.md](../schemas/attendance.md), [quiz.md](../schemas/quiz.md)
- Backlog: GAP-087–089, GAP-097–099 in [Gap-Backlog-Doc.md](./Gap-Backlog-Doc.md); REP-006–010 in [Report-Generation-Function-Doc.md](./Report-Generation-Function-Doc.md)
- **tdtd-node:** migrations, enrollment API, daily attendance, grade computation, `/api/reports/*`
- **tdtd-batch:** SF1–SF10 report services and jobs
- **tdtd-frontend:** extended student import/profile, attendance codes, Reports page, grades grid

**Files involved:** See phase todos in plan; primary touchpoints under `tdtd-node/src/`, `tdtd-batch/`, `tdtd-frontend/src/`, `.cursor/schemas/`, `.cursor/documentation/`.

**Schemas involved:** `school_settings`, extended `classes`/`students`, `daily_attendance_records`, `computed_subject_grades`, `enrollment_history`, extended `score_events`.

---

## Out of scope (v1)

- DepEd LMS / BEIS upload
- Conduct/values grades on SF9 (blank or manual override)
- Pixel-perfect historical form revisions

**Data ownership (GAP-001):** School settings and DepEd exports are per-teacher. See [GAP-001.md](../gaps/GAP-001.md).

---

## Privacy

- Exported forms contain learner names, LRN, addresses, and parent/guardian data — same sensitivity as roster screens. Store under protected `data/reports/`; serve downloads only to authenticated teachers via API.

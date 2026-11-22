# Report generation — function documentation

Server-side **PDF report generation** in **`tdtd-batch`** (Java + Apache PDFBox). Reports read the same SQLite database as **`tdtd-node`**; v1 covers daily attendance session rosters.

**Canonical schema:** [attendance.md](../schemas/attendance.md) · **Attendance UI:** [Attendance-Function-Doc.md](./Attendance-Function-Doc.md) · **Batch runtime:** [TDTD-Batch-Function.md](./TDTD-Batch-Function.md)

---

## Architecture

```text
TDTD_BATCH_RUN_ONCE=ATTENDANCE_PDF + env (date, period, output dir)
        │
        ▼
BatchApplication ──► AttendancePdfJob ──► AttendancePdfService
        │                                      │
        │                                      ├── AttendanceReportDao (JDBC)
        │                                      └── PDFBox renderer
        ▼
teacher_app.sqlite ◄── shared with tdtd-node
        │
        ▼
data/reports/attendance-YYYY-MM-DD-AM.pdf
```

Report generation is **read-only** — no writes to `attendance_sessions`, `teacher_reminders`, or `activity_logs`.

---

## Entry REP-001 — Attendance session PDF (initial)

**Date:** 2026-06-11

**Summary:** Run-once batch job generates a PDF roster for one calendar date + AM/PM session, with per-class sections and present/absent marks.

**Reason:** Teachers need a printable/exportable attendance record aligned with the session screen; batch provides a reliable server-side path without adding API surface in v1.

**What changed:**

### Trigger and environment

| Variable | Default | Purpose |
|----------|---------|---------|
| `TDTD_BATCH_RUN_ONCE` | — | Set to `ATTENDANCE_PDF` to generate once and exit |
| `TDTD_PDF_DATE` | today in `TDTD_TIMEZONE` | Session date (`YYYY-MM-DD`) |
| `TDTD_PDF_PERIOD` | — | **Required:** `AM` or `PM` |
| `TDTD_PDF_OUTPUT_DIR` | `data/reports` | Output directory (created if missing) |
| `TDTD_DB_PATH` | `data/teacher_app.sqlite` | Same SQLite file as tdtd-node |
| `TDTD_TIMEZONE` | `Asia/Manila` | Default date and footer timestamp |

**Example (manual / Task Scheduler):**

```bash
export TDTD_DB_PATH=../tdtd-node/data/teacher_app.sqlite
export TDTD_PDF_DATE=2026-06-10
export TDTD_PDF_PERIOD=AM
export TDTD_PDF_OUTPUT_DIR=data/reports
TDTD_BATCH_RUN_ONCE=ATTENDANCE_PDF java -jar tdtd-batch-app/target/tdtd-batch-app.jar
```

**Output filename:** `{TDTD_PDF_OUTPUT_DIR}/attendance-{date}-{period}.pdf` (e.g. `attendance-2026-06-10-AM.pdf`).

### PDF layout

- Title: **Attendance Report**
- Subheader: date (long form) + period (`AM` / `PM`)
- If no saved session: banner *"No attendance session saved"*; all students marked absent
- Per applicable class (see class/period rules below):
  - Class name heading
  - Table: `# | Name | Present` — checkmark when present, dash when absent
  - Summary: `{present} / {total} present`
- Session totals across all classes
- Footer: generation timestamp in `TDTD_TIMEZONE`

### Business rules

| Rule | Behavior |
|------|----------|
| **Weekends** | Rejected with exit code 2 (same as `POST /api/attendance/save`) |
| **Class sections** | Mirrors frontend `listClassesForAttendancePeriod` — AM prefers `MRNG`, PM prefers `AFTNN`; one row per grade name with fallback |
| **Present status** | Student has row in `attendance_records` for the session → present; otherwise absent |
| **No session row** | PDF still generated (audit); warning logged |
| **Student sort** | `last_name`, `first_name` (case-insensitive) |

### tdtd-batch modules

- `AttendanceReportDao` — JDBC reads for sessions, classes, students, present ids
- `ClassPeriodFilter` — period-aware class list (port of `classShift.ts`)
- `AttendancePdfService` — PDFBox rendering + atomic file write
- `AttendancePdfJob` — run-once entry from `BatchApplication`

**Files involved:**

- `tdtd-batch/pom.xml`, `tdtd-batch-services/pom.xml` — Apache PDFBox dependency
- `tdtd-batch/tdtd-batch-util/.../BatchConfig.java` — PDF env vars
- `tdtd-batch/tdtd-batch-dao/.../AttendanceReportDao.java`, `model/*.java`
- `tdtd-batch/tdtd-batch-services/.../ClassPeriodFilter.java`, `AttendancePdfService.java`
- `tdtd-batch/tdtd-batch-app/.../job/AttendancePdfJob.java`, `BatchApplication.java`
- `tdtd-batch/README.md`
- This file

**Schemas involved:**

- [attendance.md](../schemas/attendance.md) — `attendance_sessions`, `attendance_records`
- [core.md](../schemas/core.md) — `classes`, `students`

---

## Future entries (shipped with DepEd epic)

| Id | Summary | Notes |
|----|---------|-------|
| REP-002 | On-demand PDF/Excel via `tdtd-node` API + Reports UI | `GET /api/reports/:form` |
| REP-003 | Superseded by REP-007 (SF4 monthly matrix) | — |
| REP-004 | DepEd SF1 layout (PDF/Excel) | GAP-083 |
| REP-005 | Scheduled cron for end-of-day PDF generation | Quartz trigger in batch daemon |
| REP-006 | DepEd SF2 daily attendance (PDF/Excel) | GAP-089 |
| REP-007 | DepEd SF4 monthly class attendance (PDF/Excel) | GAP-097 |
| REP-008 | DepEd SF9 report card (PDF) | GAP-084 |
| REP-009 | DepEd SF10 permanent record (PDF) | GAP-084, GAP-099 |
| REP-010 | DepEd SF5 promotion report (PDF/Excel) | GAP-098 |

See [DepEd-School-Forms-Function-Doc.md](./DepEd-School-Forms-Function-Doc.md) for batch env vars and field mappings.

---

## Entry REP-004 — DepEd SF1 export

**Date:** 2026-06-14

**Summary:** Batch job `TDTD_BATCH_RUN_ONCE=SF1_PDF` generates SF1 School Register PDF and Excel from enrollment + school settings.

**Batch env:** `TDTD_REPORT_CLASS_ID`, `TDTD_REPORT_OUTPUT_DIR`, `TDTD_DB_PATH`, `TDTD_TIMEZONE`.

**Output:** `sf1-{classId}-{schoolYear}.pdf` / `.xlsx`

**Schemas:** `school_settings`, extended `classes`/`students`, `daily_attendance_records`.

---

## Entry REP-006 — DepEd SF2 export

**Date:** 2026-06-14

**Summary:** Batch job `TDTD_BATCH_RUN_ONCE=SF2_PDF` — daily attendance report for a class and month.

**Batch env:** `TDTD_REPORT_CLASS_ID`, `TDTD_REPORT_MONTH` (YYYY-MM), `TDTD_REPORT_OUTPUT_DIR`.

**Output:** `sf2-{classId}-{month}.pdf` / `.xlsx`

---

## Entry REP-007 — DepEd SF4 export

**Date:** 2026-06-14

**Summary:** Batch job `TDTD_BATCH_RUN_ONCE=SF4_PDF` — monthly class attendance matrix with M/F breakdown.

**Output:** `sf4-{classId}-{month}.pdf` / `.xlsx`

---

## Entry REP-008 — DepEd SF9 export

**Date:** 2026-06-14

**Summary:** Batch job `TDTD_BATCH_RUN_ONCE=SF9_PDF` — learner report card per student or class batch.

**Output:** `sf9-{studentId}-{schoolYear}.pdf`

---

## Entry REP-009 — DepEd SF10 export

**Date:** 2026-06-14

**Summary:** Batch job `TDTD_BATCH_RUN_ONCE=SF10_PDF` — permanent record from `enrollment_history`.

**Output:** `sf10-{studentId}.pdf`

---

## Entry REP-010 — DepEd SF5 export

**Date:** 2026-06-14

**Summary:** Batch job `TDTD_BATCH_RUN_ONCE=SF5_PDF` — class promotion report with final grades and action taken.

**Output:** `sf5-{classId}-{schoolYear}.pdf` / `.xlsx`

---

## Future entries (not shipped)

| Id | Summary | Notes |
|----|---------|-------|
| REP-005 | Scheduled cron for end-of-day PDF generation | Quartz trigger in batch daemon |

---

## Privacy

- PDFs contain student names (same data as the attendance session screen).
- Store output files in a protected directory on the server; not exposed via HTTP in v1.

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

## Future entries (not shipped)

| Id | Summary | Notes |
|----|---------|-------|
| REP-002 | On-demand PDF download via `tdtd-node` API + Attendance UI button | User-triggered export |
| REP-003 | Monthly attendance matrix PDF (students × school days) | Date-range report |
| REP-004 | DepEd SF1 layout (PDF/Excel) | See [Gap-Backlog-Doc.md](./Gap-Backlog-Doc.md) GAP-083 |
| REP-005 | Scheduled cron for end-of-day PDF generation | Quartz trigger in batch daemon |

---

## Privacy

- PDFs contain student names (same data as the attendance session screen).
- Store output files in a protected directory on the server; not exposed via HTTP in v1.

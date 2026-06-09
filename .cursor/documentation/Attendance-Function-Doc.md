# Attendance — function documentation

Daily **AM/PM** attendance: calendar of saved sessions, per-class roster check-off, and global session + present records in SQLite.

**Canonical schema:** [attendance.md](../schemas/attendance.md) · **Shared entities:** [core.md](../schemas/core.md)

**API base:** `/api/attendance`

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/session-dates?from=&to=` | Dates that have any saved session in range (max 366 days) |
| GET | `/state?date=&period=&classId=` | Session + present student ids for one class |
| GET | `/present-roster?date=&period=` | Session + full present student rows (all classes) |
| POST | `/save` | Create/reuse session; replace present records for submitted ids |

**Session URL:** `/attendance/session/:date?period=AM|PM` — `period` query selects morning vs afternoon; omit on calendar open to auto-resolve (see ATT-004).

---

## Weekend rules

Attendance is **weekday-only** (Monday–Friday). Saturday and Sunday are not school days.

| Layer | Behavior |
|-------|----------|
| **Calendar** (`MonthlyCalendar`) | Weekend cells disabled (gray, not clickable); future dates also disabled |
| **Calendar page** | When today is a weekend, an info banner: *"No attendance on weekends — pick a weekday from the calendar."* |
| **Session page** | If `:date` is Sat/Sun, shows unavailable card (*"Attendance is not taken on weekends."*) with link back to calendar — no roster editing |
| **DueList** | No attendance due items on weekends; empty state copy explains why — see [Due-List-Function-Doc.md](./Due-List-Function-Doc.md) |
| **API save** | `POST /save` returns `400 attendance is not recorded on weekends` for Sat/Sun dates |
| **API read** | GET endpoints unchanged — legacy weekend rows (if any) remain readable |

**Weekend definition (frontend):** local calendar weekday from `parseYMD(ymd)` (`isWeekendYmd` / `isWeekendDate` in `lib/dates.ts`).

**Weekend definition (backend save):** `isWeekendYmd(ymd, TDTD_TIMEZONE)` — default `Asia/Manila`, same as due-list and batch.

---

## Class display (session page)

On the attendance session screen, class names are shown **without** a shift suffix. The AM/PM toggle selects the session period; the Class list shows **one row per grade name**.

| UI element | Label format | Notes |
|------------|--------------|-------|
| Class `<select>` options | `{class.name}` only | e.g. "Grade 5", not "Grade 5 · Morning (MRNG)" |
| Present-roster panel (per student) | `{class.name}` only | Same rationale |
| Class list (AM and PM) | Same grade names in both periods | `listClassesForAttendancePeriod` — prefers shift matching the period (`MRNG` for AM, `AFTNN` for PM); if a grade has only one section registered, it appears in both periods |
| Empty-state / helper copy | May still mention MRNG/AFTNN | When no classes exist at all — unchanged |

**Other pages** (Classes, Scores, Register Students, Student Lab) still use `formatClassShiftLabel` with `{name} · {shift}` where morning and afternoon classes appear together.

---

## Entry ATT-006 — Session class labels without shift suffix

**Date:** 2026-06-07

**Summary:** Show grade/class name only in attendance session Class dropdown and present-roster panel.

**Reason:** AM/PM toggle already indicates session period; repeating "Morning (MRNG)" on every option adds noise.

**What changed:**
- **`AttendanceSession`:** Class `<select>` options and present-roster rows render `{class.name}` only; removed `formatClassShiftLabel` from this page.
- **`classShift.ts`:** `listClassesForAttendancePeriod` — same grade names in AM and PM; prefers period-matching shift, falls back when only one section exists (e.g. morning-only grades still listed in PM).

**Files involved:**
- `tdtd-frontend/src/pages/AttendanceSession/AttendanceSession.tsx`
- `tdtd-frontend/src/lib/classShift.ts`
- `tdtd-frontend/src/lib/classShift.test.ts`

**Schemas involved:**
- None (presentation only)

---

## Entry ATT-005 — Weekend attendance unavailable

**Date:** 2026-06-07

**Summary:** Block attendance on Sat/Sun at the session UI and on the save API; add calendar weekend banner.

**Reason:** School attendance applies on weekdays only; closes the URL bypass gap where teachers could open `/attendance/session/:date` directly on a weekend.

**What changed:**
- **`lib/dates.ts`:** `isWeekendYmd`, `isWeekendDate` — shared frontend weekend checks.
- **`AttendanceSession`:** Unavailable card when session date is a weekend; data-fetch effects skip weekend dates.
- **`AttendanceCalendar`:** Info banner when today is a weekend.
- **`MonthlyCalendar` / `DueList`:** Refactored to use shared date helpers.
- **`attendance.service.ts`:** `assertWeekday` on `saveAttendance` only; read paths unchanged.

**Files involved:**
- `tdtd-frontend/src/lib/dates.ts`
- `tdtd-frontend/src/lib/dates.test.ts`
- `tdtd-frontend/src/pages/AttendanceSession/AttendanceSession.tsx`
- `tdtd-frontend/src/pages/AttendanceCalendar/AttendanceCalendar.tsx`
- `tdtd-frontend/src/components/MonthlyCalendar/MonthlyCalendar.tsx`
- `tdtd-frontend/src/components/DueList/DueList.tsx`
- `tdtd-node/src/services/attendance.service.ts`
- `tdtd-node/src/services/attendance.service.test.ts`

**Schemas involved:**
- None

---

## Entry ATT-004 — Session period in URL, AM/PM toggle, calendar auto-resolve

**Date:** 2026-05-26

**Summary:** Fix reopening saved attendance from the calendar by binding the session screen to an explicit AM/PM period (URL + toggle) instead of always using the current time of day.

**Reason:** Calendar dots mark any date with a saved session (AM or PM), but the session page previously loaded only `getCurrentPeriod()`. Opening a past date in the afternoon could show an empty PM session while attendance was saved in the morning.

**What changed:**
- **URL query `?period=AM|PM`** is the source of truth when set; toggling Morning/Afternoon updates the query with `replace`.
- **Auto-resolve** when opening `/attendance/session/:date` without `period` (e.g. from calendar): fetches present roster for both periods, prefers current clock period if it has a session, otherwise the other period, then writes `?period=` into the URL.
- **Morning / Afternoon toggle** on the session header to switch periods without returning to the calendar.
- **Calendar** navigates to date-only paths so auto-resolve can run.
- **Helpers:** `lib/period.ts` (`parseAttendancePeriod`, `otherAttendancePeriod`), `lib/attendanceSessionRoute.ts` (`attendanceSessionPath` for stable deep links).
- **Recents links:** `activityLinks.ts` uses `attendanceSessionPath(date, period)` when `metadata.period` is present (falls back to current period).

**Files involved:**
- `tdtd-frontend/src/pages/AttendanceSession/AttendanceSession.tsx`
- `tdtd-frontend/src/pages/AttendanceCalendar/AttendanceCalendar.tsx`
- `tdtd-frontend/src/lib/period.ts`
- `tdtd-frontend/src/lib/attendanceSessionRoute.ts`
- `tdtd-frontend/src/lib/activityLinks.ts`

**Schemas involved:**
- None (frontend routing/UX only; backend already keys sessions by `date` + `period`)

---

## Entry ATT-003 — Attendance schema extracted to `.cursor/schemas`

**Date:** 2026-05-20

**Summary:** Moved canonical attendance table docs out of monolithic agent rules into dedicated schema markdown; no runtime behavior change.

**Reason:** Keep schema source-of-truth in one place for agents and humans, separate from feature change history.

**What changed:**
- Added [attendance.md](../schemas/attendance.md) with `attendance_sessions`, `attendance_records`, indexes, save flow, shift filtering rules.
- Slimmed [Schema-Rules.md](../rules/Schema-Rules.md) to link to schema files.
- Pointed DDL comments in `migrate.ts` at `.cursor/schemas`.

**Files involved:**
- `.cursor/schemas/attendance.md`
- `.cursor/schemas/README.md`
- `.cursor/rules/Schema-Rules.md`
- `tdtd-node/src/db/migrate.ts` (comments only)

**Schemas involved:**
- [attendance.md](../schemas/attendance.md)
- [core.md](../schemas/core.md) — `classes.shift` drives AM/PM class filtering

---

## Entry ATT-002 — Attendance UI layout and responsive styling

**Date:** 2026-05-12

**Summary:** Updated look and feel for attendance (and app shell) on web and mobile breakpoints.

**Reason:** Improve usability on teacher phones and small screens without changing attendance data model.

**What changed:**
- Refined layout, spacing, and navigation on attendance calendar and session pages.
- Aligned styling with broader app UI refresh (see [UI-Rules.md](../rules/UI-Rules.md)).

**Files involved:**
- `tdtd-frontend/src/pages/AttendanceCalendar/AttendanceCalendar.tsx`
- `tdtd-frontend/src/pages/AttendanceSession/AttendanceSession.tsx`
- Related layout/shell components touched in the same commit

**Schemas involved:**
- None (presentation only)

---

## Entry ATT-001 — Initial attendance feature (backend + frontend)

**Date:** 2026-05-11

**Summary:** End-to-end global attendance: monthly calendar, AM/PM session screen, REST API, SQLite tables, present-only MVP.

**Reason:** Teachers need a simple way to record who was present each morning and afternoon across all classes, without storing attendance on student rows.

**What changed:**
- **Data:** `attendance_sessions` (unique `date` + `period`), `attendance_records` (present per student per session).
- **Backend:** DAO, queries, service (session reuse, class-scoped save, date range validation), controller, routes under `/api/attendance`.
- **Business rules:** One session per calendar date + AM/PM; only `present` status stored; AM sessions filter `classes` with `shift = MRNG`, PM with `AFTNN`. Roster must not duplicate the same children under both shifts — see [Classes-Function-Doc.md](./Classes-Function-Doc.md) and [core.md](../schemas/core.md) **Class shift and roster rules**.
- **Frontend:** `AttendanceCalendar` loads session dates per month; `AttendanceSession` loads state per class and saves via `attendanceApi`.
- **Client API:** `getAttendanceSessionDatesRange`, `getAttendanceState`, `getAttendancePresentRoster`, `saveAttendance`.

**Files involved:**
- `tdtd-node/src/db/migrate.ts` — attendance DDL
- `tdtd-node/src/dao/attendance.dao.ts`
- `tdtd-node/src/queries/attendance.queries.ts`
- `tdtd-node/src/services/attendance.service.ts`
- `tdtd-node/src/controllers/attendance.controller.ts`
- `tdtd-node/src/routes/attendance.routes.ts`
- `tdtd-node/src/app.ts` — mounts `/api/attendance`
- `tdtd-node/src/schema/types.ts` — attendance row types
- `tdtd-frontend/src/api/attendanceApi.ts`
- `tdtd-frontend/src/pages/AttendanceCalendar/AttendanceCalendar.tsx`
- `tdtd-frontend/src/pages/AttendanceSession/AttendanceSession.tsx`
- `tdtd-frontend/src/components/MonthlyCalendar/MonthlyCalendar.tsx` (calendar UX)
- `tdtd-frontend/src/App.tsx` — routes `/attendance`, `/attendance/session/:date`

**Schemas involved:**
- [attendance.md](../schemas/attendance.md) — `attendance_sessions`, `attendance_records`
- [core.md](../schemas/core.md) — `classes`, `students`

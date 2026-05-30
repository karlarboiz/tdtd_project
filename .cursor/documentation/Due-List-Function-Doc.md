# DueList — function documentation

**DueList** is the teacher-facing list of work that **still needs to be done** — attendance not saved, and (later) other actionable gaps. It answers: *“What should I do right now?”*

It is **not** [Recents](./Recents-Function-Doc.md) (what you already did) and **not** a notification inbox (no push in v1). It is an in-app **due** list with clear next steps.

**Canonical persistence (v1):** [reminders.md](../schemas/reminders.md) — table `teacher_reminders`  
**Related:** [Attendance-Function-Doc.md](./Attendance-Function-Doc.md) · [TDTD-Batch-Function.md](./TDTD-Batch-Function.md)

**Status:** Shipped (DUE-001)

---

## Three systems (do not mix)

| System | Question it answers | Example |
|--------|---------------------|---------|
| **Recents** | What did I already do? | “Saved AM attendance for 2026-05-28” |
| **DueList** | What do I still need to do? | “Take PM attendance for today” |
| **Batch** | When should the server open/close due rows? | 07:00 → open AM due if no session |

DueList **reads** open rows from `teacher_reminders` (v1) and **maps** them to UI-friendly **DueItem** objects. Batch and attendance save keep that table in sync.

```text
tdtd-batch (cron) ──► teacher_reminders ◄── tdtd-node (sync + dismiss + resolve on save)
                              ▲
tdtd-frontend ◄──── GET /api/due-list ────┘
       │
   DueList UI (Home, Attendance calendar)
```

---

## Product behavior

### Purpose

- Show a **single list** of incomplete obligations, not scattered banners.
- Each row has a **primary action** (e.g. open attendance session) and optional **Dismiss**.
- When nothing is due, the section is **hidden** (no empty-state noise on Home).

### v1 scope — attendance only

| Due kind | Shown when | Cleared when |
|----------|------------|--------------|
| `ATTENDANCE_DUE` (AM) | No `attendance_sessions` row for **today** + `AM` | Teacher saves attendance for that date + period (any class) |
| `ATTENDANCE_DUE` (PM) | No session for **today** + `PM` | Same |

**Display rules (attendance):**

- Shown only when the due **date is today** (in `TDTD_TIMEZONE`).
- **Hidden on weekends** (Saturday and Sunday in that timezone) — no DueList attendance rows even if reminders exist in the DB.
- `GET /api/due-list?date=` with a date other than today returns no attendance items.

**“Incomplete”** = missing session row, not partial roster check-off. Saving with zero students present still counts as done.

**Copy:** generic only — no student names in messages (e.g. “Take AM attendance for today.”).

**Timezone:** “Today” and weekend use `TDTD_TIMEZONE` (default `Asia/Manila`), same as attendance and batch.

### Out of v1 (future DueList kinds)

| Kind (planned) | Rule sketch |
|----------------|-------------|
| Past attendance | School days in last N days missing AM or PM session |
| Setup | No active school year; class with no students |
| Scores | Score event created but no entries saved |

New kinds extend `DueItem.kind` and either add `teacher_reminders.type` values or compute rows in the DueList service without UI rewrites.

### Dismiss vs done

| Teacher action | DueList effect | `teacher_reminders.status` |
|----------------|----------------|----------------------------|
| Saves attendance | Row removed on next load | `resolved` |
| Taps **Dismiss** | Row hidden until rules reopen it | `dismissed` |
| — | Batch/sync finds session exists | `resolved` |

**v1 note:** If teacher dismisses without saving, the AM/PM item stays hidden until the next calendar day’s batch run (same as current reminder banners). A future improvement could re-surface dismissed rows when the period is still missing before end of day.

---

## DueItem (API / UI model)

DueList exposes **DueItem** — a stable shape for the frontend, decoupled from DB column names.

```ts
export type DueItemKind = 'ATTENDANCE_DUE' // extend later

export interface DueItem {
  id: string              // teacher_reminders.id (v1)
  kind: DueItemKind
  title: string           // short label, e.g. "AM attendance"
  message: string         // full line shown in the list
  date: string            // YYYY-MM-DD
  period?: 'AM' | 'PM'
  actionPath: string      // in-app route, e.g. /attendance/session/2026-05-30?period=AM
  createdAt: number
}
```

Mapping from `TeacherReminderRow` is 1:1 in v1 (`ATTENDANCE_DUE` only).

---

## API

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/due-list?date=` | Today’s open due items (Home banner). On-demand sync; weekdays only. |
| GET | `/api/due-list/missed?from=&to=` | All missed weekday AM/PM slots in range (no session saved). Default `from`: active school year start or 90 days back; `to`: today. |
| POST | `/api/reminders/:id/dismiss` | Dismiss today’s reminder rows (DueItem.id from reminders, not `missed:*` ids) |

**Route:** `/due-list` — **DueList** page in nav.

**On-demand sync (GET /api/due-list):** calls the same logic as batch (`syncAttendanceDueReminder` for AM and PM) so DueList works without `tdtd-batch` in dev. Production still benefits from scheduled batch.

**Backward compatibility:** `GET /api/reminders/active` remains; new UI uses `/api/due-list` only.

---

## Frontend

| Piece | Responsibility |
|-------|----------------|
| `dueListApi.ts` | `listDueItems(date?)` → GET `/api/due-list` |
| `DueList` component | Section on Home + Attendance calendar; list of DueItem rows |
| Row UI | Title/message, **Do it** → `actionPath`, **Dismiss** → existing dismiss API |
| Refresh | Refetch on mount; refetch when returning to Home / calendar (navigation or visibility) |

**Replaces:** `ReminderBanners` (amber banners) — same data, DueList presentation.

**Accessibility:** `role="list"` / `role="listitem"`, `aria-live="polite"` when items appear.

---

## Backend

| Piece | Responsibility |
|-------|----------------|
| `dueList.service.ts` | `listDueItems(db, date?)` — sync AM/PM, load open reminders, map → `DueItem[]` |
| `dueList.routes.ts` / controller | GET handler |
| `lib/attendanceSessionPath.ts` (node) | Build `actionPath` for attendance items (mirror frontend helper) |

**Unchanged:** `teacherReminder.service.ts`, `teacher_reminders` DDL, batch jobs, resolve on `POST /api/attendance/save`.

---

## Entry DUE-003 — DueList page (missed attendance)

**Date:** 2026-05-30

**Summary:** Nav link and `/due-list` page listing weekday dates with missing AM or PM attendance; `GET /api/due-list/missed`.

**Reason:** Teachers need a full backlog of blank attendance days, not only today’s prompts on Home.

**What changed**

- `listMissedAttendanceDueItems` — scans range vs `attendance_sessions`, skips weekends
- `DueListPage.tsx`, nav + Home tile
- `attendance` query `sessionsInRange`

**Files involved**

- `dueList.service.ts`, `dueList.routes.ts`, `DueListPage.tsx`, `App.tsx`, `AppShell.tsx`, `Home.tsx`, `attendance.dao.ts`, `attendance.queries.ts`

---

## Entry DUE-002 — Attendance due: today + weekdays only

**Date:** 2026-05-30

**Summary:** DueList hides attendance items unless the date is today and the current day is not Saturday/Sunday (`shouldShowAttendanceDue` in `dueList.service.ts`, `isWeekendInTimezone` in `timezone.ts`).

**Reason:** Teachers should not see “take attendance” prompts on weekends or for past/future dates.

**What changed**

- `listDueItems` skips sync and returns `[]` when rules fail
- Tests for weekend, non-today, and weekday paths

**Files involved**

- `tdtd-node/src/services/dueList.service.ts`, `dueList.service.test.ts`, `lib/timezone.ts`, `lib/timezone.test.ts`

---

## Entry DUE-001 — DueList (initial)

**Date:** 2026-05-30

**Summary:** `GET /api/due-list`, `dueList.service.ts` with on-demand AM/PM sync, `DueList` UI on Home and Attendance calendar; removed `ReminderBanners`.

**Reason:** Teachers need one obvious place for “what I haven’t done yet,” separate from Recents history and separate from raw reminder storage.

**What changed**

### tdtd-node

- `DueItem` in `schema/types.ts`
- `dueList.service.ts`, `dueList.routes.ts`, `dueList.controller.ts`, `lib/attendanceSessionPath.ts`
- `GET /api/due-list` mounted in `app.ts`
- `dueList.service.test.ts`

### tdtd-frontend

- `dueListApi.ts`, `components/DueList/DueList.tsx`
- Home + Attendance calendar use `DueList`; removed `ReminderBanners.tsx`

### Docs

- This file, [reminders.md](../schemas/reminders.md), [TDTD-Batch-Function.md](./TDTD-Batch-Function.md)

**Files involved**

- `tdtd-node/src/services/dueList.service.ts`, `dueList.service.test.ts`, `routes/dueList.routes.ts`, `controllers/dueList.controller.ts`, `lib/attendanceSessionPath.ts`, `schema/types.ts`, `app.ts`
- `tdtd-frontend/src/api/dueListApi.ts`, `components/DueList/DueList.tsx`, `pages/Home/Home.tsx`, `pages/AttendanceCalendar/AttendanceCalendar.tsx`, `types/schema.ts`

**Schemas involved**

- [reminders.md](../schemas/reminders.md)
- [attendance.md](../schemas/attendance.md)

---

## Comparison: before vs after

| Before (BATCH-001) | After (DUE-001) |
|--------------------|-----------------|
| `ReminderBanners` — one amber card per reminder | `DueList` — labeled list section |
| `GET /api/reminders/active` only | `GET /api/due-list` (+ sync); reminders API kept |
| No sync on page load | Sync AM/PM when loading DueList |
| Name “reminders” in UI | Product name **DueList** |

Persistence and batch schedules stay the same; this is primarily **product surface + API naming + sync-on-read**.

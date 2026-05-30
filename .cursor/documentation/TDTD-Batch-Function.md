# TDTD Batch — function documentation

Scheduled background work for **Teacher's Dilemma Today**: server-side jobs in **`tdtd-batch`** (Java + Quartz) that read the same SQLite database as **`tdtd-node`**, plus API and web UI to surface **prompts** (distinct from [Recents](./Recents-Function-Doc.md) history).

**Canonical schema:** [reminders.md](../schemas/reminders.md) · **Attendance:** [Attendance-Function-Doc.md](./Attendance-Function-Doc.md) · **Mobile roadmap:** [Mobile-App-Version-Plan.md](./Mobile-App-Version-Plan.md)

---

## Three jobs (do not mix)

| Job | System | Example |
|-----|--------|---------|
| **History** | `activity_logs` + Recents | “Saved AM attendance for 2026-05-28” |
| **Prompt** | `teacher_reminders` + banners / (later) push | “Take AM attendance for today” |
| **Background** | `tdtd-batch` Quartz jobs | 07:00 check → open reminder if session missing |

Batch must **not** insert Recents rows for daily nudges.

---

## Architecture

```text
tdtd-batch (Java, Quartz) ──JDBC──► teacher_app.sqlite ◄── better-sqlite3 ── tdtd-node (Express)
                                              ▲
tdtd-frontend ◄──────── REST /api/due-list, /api/reminders ──┘
```

| Layer | Responsibility |
|-------|----------------|
| **`teacher_reminders`** | Durable prompt state: `open` \| `dismissed` \| `resolved` |
| **`tdtd-node`** | `GET /api/due-list` (sync on read), `GET /api/reminders/active`, `POST /api/reminders/:id/dismiss`, resolve on `POST /api/attendance/save` |
| **`tdtd-batch`** | Cron: if no `attendance_sessions` row for (today, period) → open reminder; else resolve open |
| **`tdtd-frontend`** | [DueList](./Due-List-Function-Doc.md) on Home + Attendance calendar; deep link to session |
| **Mobile (later)** | Capacitor **local** notifications at device time; sync pulls `teacher_reminders` when online |

**Timezone:** `TDTD_TIMEZONE` (default `Asia/Manila`) for “today” in batch and API default date.

**Schedule (env-overridable Quartz cron):**

| Job | Default local time | Env override |
|-----|-------------------|--------------|
| AM attendance | 07:00 | `TDTD_CRON_AM` |
| PM attendance | 12:30 | `TDTD_CRON_PM` |

**One-shot (OS Task Scheduler):** `TDTD_BATCH_RUN_ONCE=AM` or `PM` runs `AttendanceReminderJob` once and exits.

---

## Entry BATCH-001 — Attendance reminders (initial)

**Date:** 2026-05-28

**Summary:** `teacher_reminders` table, reminders REST API, web banners, Java `tdtd-batch` with AM/PM `AttendanceReminderJob`.

**Reason:** Teachers need proactive “take attendance” prompts without duplicating Recents; batch provides a reliable server clock when the API is hosted 24/7; mobile will add on-device alarms later.

**What changed**

### Data

- Table `teacher_reminders` in [`tdtd-node/src/db/migrate.ts`](../../tdtd-node/src/db/migrate.ts)
- Partial unique index: at most one **open** row per `(type, date, period)`
- Type `ATTENDANCE_DUE`; generic `message` (no student names)

### tdtd-node API

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/reminders/active?date=` | Open reminders for date (default: today in `TDTD_TIMEZONE`) |
| POST | `/api/reminders/:id/dismiss` | Teacher dismissed banner |

**Side effect:** `POST /api/attendance/save` resolves open `ATTENDANCE_DUE` for that `date` + `period`.

### tdtd-batch

- Maven multi-module: `tdtd-batch-app`, `tdtd-batch-services`, `tdtd-batch-dao`, `tdtd-batch-util`
- Dependencies: SQLite JDBC, Quartz, SLF4J simple
- `AttendanceReminderJob` — parameter `period=AM|PM`
- Env: `TDTD_DB_PATH`, `TDTD_TIMEZONE`, `TDTD_CRON_AM`, `TDTD_CRON_PM`, `TDTD_BATCH_RUN_ONCE`

### tdtd-frontend

- `dueListApi.ts`, `DueList.tsx` on Home and Attendance calendar (see [Due-List-Function-Doc.md](./Due-List-Function-Doc.md))
- Link → `attendanceSessionPath(today, period)`
- `reminderSchedule.ts` — stub for future Capacitor local notifications (web no-op)

### Docs / schema

- [reminders.md](../schemas/reminders.md)
- This file

**Files involved**

- `tdtd-node/src/db/migrate.ts`, `queries/teacherReminder.queries.ts`, `dao/teacherReminder.dao.ts`, `services/teacherReminder.service.ts`, `services/attendance.service.ts`, `routes/reminders.routes.ts`, `controllers/reminders.controller.ts`, `app.ts`, `lib/timezone.ts`
- `tdtd-frontend/src/api/dueListApi.ts`, `api/remindersApi.ts`, `components/DueList/DueList.tsx`, `pages/Home/Home.tsx`, `pages/AttendanceCalendar/AttendanceCalendar.tsx`, `lib/reminderSchedule.ts`, `types/schema.ts`
- `tdtd-batch/pom.xml`, `tdtd-batch-*/pom.xml`, `com.tdtd.batch.*` sources
- `.cursor/schemas/reminders.md`, `.cursor/documentation/README.md`

**Schemas involved**

- [reminders.md](../schemas/reminders.md)
- [attendance.md](../schemas/attendance.md) — session existence check

---

## Deployment

| Environment | Batch | Notes |
|-------------|-------|-------|
| Dev | Optional | Same `TDTD_DB_PATH` as `tdtd-node`; run jar or `TDTD_BATCH_RUN_ONCE` |
| Production | Always-on JVM | One batch instance per DB volume |
| Mobile offline | N/A for batch | Use `reminderSchedule.ts` + local DB when Capacitor ships |

**Build batch:** from `tdtd-batch/`: `mvn -q package` → `tdtd-batch-app/target/tdtd-batch-app.jar`

**Run batch daemon:** `java -jar tdtd-batch-app/target/tdtd-batch-app.jar` with `TDTD_DB_PATH` set.

---

## Future jobs (not in BATCH-001)

| Job | Trigger | Output |
|-----|---------|--------|
| Nightly reminder sweep | 23:59 | Resolve orphaned open rows |
| SQLite backup verify | 02:00 | Log / alert |
| Sync outbox stale | hourly | After mobile sync API exists |
| `GET /api/sync/pull` | — | Include `teacher_reminders` rows |

---

## Privacy

- Reminder `message` is generic (period + date only).
- No student names in prompts or notification bodies.

---

## Related decisions

| Topic | Choice |
|-------|--------|
| DB access | Shared SQLite file (not HTTP from batch to node) |
| Web delivery v1 | In-app banners only (no Web Push) |
| Mobile delivery v1+ | Local notifications on device + sync reminders |
| Default TZ | `Asia/Manila` |

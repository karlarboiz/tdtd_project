# Reminders schema

**Prompts** for teachers to act now. Written by **`tdtd-batch`** (scheduled) or resolved by **`tdtd-node`** (attendance save, dismiss API). Not the same as [recents.md](./recents.md) (`activity_logs` history).

**DDL:** [`tdtd-node/src/db/migrate.ts`](../../tdtd-node/src/db/migrate.ts) — `migrateTeacherRemindersTable`

**API:** `GET /api/reminders/active`, `POST /api/reminders/:id/dismiss`

---

## Table: `teacher_reminders`

| Column (SQLite) | Type | Notes |
|-----------------|------|--------|
| `id` | TEXT PK | UUID |
| `type` | TEXT | `ATTENDANCE_DUE` (v1) |
| `date` | TEXT | `YYYY-MM-DD` |
| `period` | TEXT | `AM` \| `PM` |
| `status` | TEXT | `open` \| `dismissed` \| `resolved` |
| `message` | TEXT | Generic copy, no student PII |
| `created_at` | INTEGER | ms epoch |
| `resolved_at` | INTEGER NULL | set when `dismissed` or `resolved` |

**Indexes**

- `idx_teacher_reminders_status_date` on `(status, date)`
- `idx_teacher_reminders_open_unique` — unique `(type, date, period)` **where** `status = 'open'` (idempotent batch upsert)

---

## TypeScript (`tdtd-node` / frontend)

- `TeacherReminderType` = `'ATTENDANCE_DUE'`
- `TeacherReminderStatus` = `'open' | 'dismissed' | 'resolved'`
- `TeacherReminderRow` — camelCase in API JSON

---

## Lifecycle

1. **Batch** (07:00 AM / 12:30 PM local): no `attendance_sessions` for `(date, period)` → insert open row (or skip if unique index blocks duplicate).
2. **Batch** (same run): session exists → `UPDATE` open row to `resolved`.
3. **Web** loads banners from `GET /api/reminders/active`.
4. **Teacher dismisses** → `POST .../dismiss` → `status = dismissed`.
5. **Teacher saves attendance** → matching open row → `resolved`.

---

## Mobile (planned)

- Device schedules local notification; on sync, pull open reminders from server to align banners and cancel duplicate local alarms.
- See [TDTD-Batch-Function.md](../documentation/TDTD-Batch-Function.md).

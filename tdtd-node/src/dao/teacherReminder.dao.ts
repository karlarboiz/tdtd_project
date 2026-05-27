import type { SqliteDatabase } from '../db/sqlite-types.js'
import type {
  AttendancePeriod,
  IsoDateString,
  TeacherReminderRow,
  TeacherReminderStatus,
  TeacherReminderType,
} from '../schema/types.js'
import { TEACHER_REMINDER_QUERIES } from '../queries/teacherReminder.queries.js'

type ReminderDbRow = {
  id: string
  type: string
  date: string
  period: AttendancePeriod
  status: TeacherReminderStatus
  message: string
  created_at: number
  resolved_at: number | null
}

function mapRow(row: ReminderDbRow): TeacherReminderRow {
  return {
    id: row.id,
    type: row.type as TeacherReminderType,
    date: row.date,
    period: row.period,
    status: row.status,
    message: row.message,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at ?? undefined,
  }
}

export function findOpenByTypeDatePeriod(
  db: SqliteDatabase,
  type: TeacherReminderType,
  date: IsoDateString,
  period: AttendancePeriod,
): TeacherReminderRow | undefined {
  const row = db
    .prepare(TEACHER_REMINDER_QUERIES.findOpenByTypeDatePeriod)
    .get(type, date, period) as ReminderDbRow | undefined
  return row ? mapRow(row) : undefined
}

export function listOpenForDate(
  db: SqliteDatabase,
  date: IsoDateString,
): TeacherReminderRow[] {
  const rows = db
    .prepare(TEACHER_REMINDER_QUERIES.listOpenForDate)
    .all(date) as ReminderDbRow[]
  return rows.map(mapRow)
}

export function findById(
  db: SqliteDatabase,
  id: string,
): TeacherReminderRow | undefined {
  const row = db.prepare(TEACHER_REMINDER_QUERIES.findById).get(id) as
    | ReminderDbRow
    | undefined
  return row ? mapRow(row) : undefined
}

export function insertReminder(db: SqliteDatabase, row: TeacherReminderRow): void {
  db.prepare(TEACHER_REMINDER_QUERIES.insert).run({
    id: row.id,
    type: row.type,
    date: row.date,
    period: row.period,
    status: row.status,
    message: row.message,
    created_at: row.createdAt,
    resolved_at: row.resolvedAt ?? null,
  })
}

export function updateStatus(
  db: SqliteDatabase,
  id: string,
  status: TeacherReminderStatus,
  resolvedAt: number,
): void {
  db.prepare(TEACHER_REMINDER_QUERIES.updateStatus).run({
    id,
    status,
    resolved_at: resolvedAt,
  })
}

export function resolveOpenByTypeDatePeriod(
  db: SqliteDatabase,
  type: TeacherReminderType,
  date: IsoDateString,
  period: AttendancePeriod,
  resolvedAt: number,
): void {
  db.prepare(TEACHER_REMINDER_QUERIES.resolveOpenByDatePeriod).run({
    type,
    date,
    period,
    resolved_at: resolvedAt,
  })
}

import type { SqliteDatabase } from '../db/sqlite-types.js'
import * as attendanceDao from '../dao/attendance.dao.js'
import * as schoolYearDao from '../dao/schoolYear.dao.js'
import { HttpError } from '../errors/http-error.js'
import { attendanceSessionPath } from '../lib/attendanceSessionPath.js'
import { isSchoolDayYmd } from '../lib/schoolDay.js'
import {
  addDaysYmd,
  getConfiguredTimezone,
  getTodayYmdInTimezone,
  isWeekendInTimezone,
} from '../lib/timezone.js'
import type {
  AttendancePeriod,
  DueItem,
  DueItemKind,
  IsoDateString,
  TeacherReminderRow,
  TeacherReminderType,
} from '../schema/types.js'
import {
  attendanceReminderMessage,
  listActiveReminders,
  syncAttendanceDueReminder,
} from './teacherReminder.service.js'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const REMINDER_TYPE_ATTENDANCE: TeacherReminderType = 'ATTENDANCE_DUE'
const DUE_KIND_ATTENDANCE: DueItemKind = 'ATTENDANCE_DUE'
const MISSED_LOOKBACK_DAYS = 90
const MAX_MISSED_SPAN_DAYS = 366
const PERIODS: AttendancePeriod[] = ['AM', 'PM']

function assertValidDate(date: string): IsoDateString {
  const d = date.trim()
  if (!DATE_RE.test(d)) {
    throw new HttpError(400, 'date must be YYYY-MM-DD')
  }
  return d
}

function resolveDate(dateRaw: unknown | undefined, today: IsoDateString): IsoDateString {
  if (typeof dateRaw === 'string' && dateRaw.trim()) {
    return assertValidDate(dateRaw)
  }
  return today
}

function attendanceDueTitle(period: AttendancePeriod): string {
  return period === 'AM' ? 'AM attendance' : 'PM attendance'
}

function ymdDaysBetweenInclusive(from: string, to: string): number {
  const a = new Date(from + 'T12:00:00')
  const b = new Date(to + 'T12:00:00')
  const ms = b.getTime() - a.getTime()
  return Math.floor(ms / (24 * 60 * 60 * 1000)) + 1
}

function missedAttendanceMessage(
  date: IsoDateString,
  period: AttendancePeriod,
  today: IsoDateString,
): string {
  if (date === today) {
    return attendanceReminderMessage(period)
  }
  const label = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date + 'T12:00:00'))
  return period === 'AM'
    ? `Take AM attendance for ${label}.`
    : `Take PM attendance for ${label}.`
}

function buildMissedAttendanceDueItem(
  date: IsoDateString,
  period: AttendancePeriod,
  today: IsoDateString,
): DueItem {
  return {
    id: `missed:${date}:${period}`,
    kind: DUE_KIND_ATTENDANCE,
    title: attendanceDueTitle(period),
    message: missedAttendanceMessage(date, period, today),
    date,
    period,
    actionPath: attendanceSessionPath(date, period),
    createdAt: new Date(date + 'T12:00:00').getTime(),
  }
}

function resolveMissedFromDate(db: SqliteDatabase, today: IsoDateString): IsoDateString {
  const sy = schoolYearDao.getActiveSchoolYear(db)
  if (sy?.startDate && sy.startDate <= today) {
    return sy.startDate
  }
  return addDaysYmd(today, -MISSED_LOOKBACK_DAYS)
}

function compareMissedDueItems(a: DueItem, b: DueItem): number {
  if (a.date !== b.date) return b.date.localeCompare(a.date)
  if (a.period === b.period) return 0
  return a.period === 'AM' ? -1 : 1
}

function reminderToDueItem(row: TeacherReminderRow): DueItem {
  if (row.type !== REMINDER_TYPE_ATTENDANCE) {
    throw new Error(`unsupported reminder type: ${row.type}`)
  }
  return {
    id: row.id,
    kind: DUE_KIND_ATTENDANCE,
    title: attendanceDueTitle(row.period),
    message: row.message,
    date: row.date,
    period: row.period,
    actionPath: attendanceSessionPath(row.date, row.period),
    createdAt: row.createdAt,
  }
}

/** Attendance due rows are only surfaced for today on school days. */
export function shouldShowAttendanceDue(
  db: SqliteDatabase,
  date: IsoDateString,
  today: IsoDateString,
  timeZone: string,
  now = new Date(),
): boolean {
  if (date !== today) return false
  if (isWeekendInTimezone(timeZone, now)) return false
  if (!isSchoolDayYmd(db, date, timeZone)) return false
  return true
}

/**
 * Open due items for a date. Syncs AM/PM attendance due state before read
 * (same rules as tdtd-batch) when attendance due rules allow display.
 */
export function listDueItems(
  db: SqliteDatabase,
  dateRaw?: unknown,
  now = new Date(),
): DueItem[] {
  const timeZone = getConfiguredTimezone()
  const today = getTodayYmdInTimezone(timeZone, now)
  const date = resolveDate(dateRaw, today)

  if (!shouldShowAttendanceDue(db, date, today, timeZone, now)) {
    return []
  }

  syncAttendanceDueReminder(db, date, 'AM')
  syncAttendanceDueReminder(db, date, 'PM')
  return listActiveReminders(db, date).map(reminderToDueItem)
}

/**
 * Weekday AM/PM slots in range with no saved attendance session (missed / blank dates).
 */
export function listMissedAttendanceDueItems(
  db: SqliteDatabase,
  fromRaw?: unknown,
  toRaw?: unknown,
  now = new Date(),
): DueItem[] {
  const timeZone = getConfiguredTimezone()
  const today = getTodayYmdInTimezone(timeZone, now)
  const to =
    typeof toRaw === 'string' && toRaw.trim()
      ? assertValidDate(toRaw)
      : today
  const from =
    typeof fromRaw === 'string' && fromRaw.trim()
      ? assertValidDate(fromRaw)
      : resolveMissedFromDate(db, today)

  if (from > to) {
    throw new HttpError(400, 'from must be on or before to')
  }
  const span = ymdDaysBetweenInclusive(from, to)
  if (span > MAX_MISSED_SPAN_DAYS) {
    throw new HttpError(
      400,
      `date range cannot exceed ${MAX_MISSED_SPAN_DAYS} days`,
    )
  }

  const saved = new Set(
    attendanceDao
      .listSessionsInRange(db, from, to)
      .map((s) => `${s.date}|${s.period}`),
  )

  const items: DueItem[] = []
  for (let d = from; d <= to; d = addDaysYmd(d, 1)) {
    if (!isSchoolDayYmd(db, d, timeZone)) continue
    for (const period of PERIODS) {
      if (!saved.has(`${d}|${period}`)) {
        items.push(buildMissedAttendanceDueItem(d, period, today))
      }
    }
  }

  return items.sort(compareMissedDueItems)
}

const QUARTER_ENDS: Record<number, string> = {
  1: '-08-31',
  2: '-10-31',
  3: '-12-31',
  4: '-03-31',
}

/** GAP-086 — surface quarter grading deadlines in DueList. */
export function listQuarterDeadlineDueItems(
  db: SqliteDatabase,
  now = new Date(),
): DueItem[] {
  const timeZone = getConfiguredTimezone()
  const today = getTodayYmdInTimezone(timeZone, now)
  const sy = schoolYearDao.getActiveSchoolYear(db)
  if (!sy) return []

  const yearStart = sy.startDate?.slice(0, 4) ?? today.slice(0, 4)
  const items: DueItem[] = []

  for (let q = 1; q <= 4; q++) {
    const suffix = QUARTER_ENDS[q]!
    const year =
      q === 4 && sy.label.includes('-')
        ? sy.label.split('-')[1]!.trim()
        : yearStart
    const deadline = `${year}${suffix}`
    if (deadline >= today && deadline <= addDaysYmd(today, 14)) {
      items.push({
        id: `quarter-deadline:Q${q}`,
        kind: 'QUARTER_DEADLINE',
        title: `Quarter ${q} grades due`,
        message: `Complete and export Q${q} report cards before ${deadline}.`,
        date: deadline,
        actionPath: '/reports',
        createdAt: now.getTime(),
      })
    }
  }

  return items
}

/** Combined due items: today attendance + missed + quarter deadlines. */
export function listAllDueItems(
  db: SqliteDatabase,
  dateRaw?: unknown,
  now = new Date(),
): DueItem[] {
  const todayItems = listDueItems(db, dateRaw, now)
  const missed = listMissedAttendanceDueItems(db, undefined, undefined, now)
  const quarter = listQuarterDeadlineDueItems(db, now)
  return [...todayItems, ...missed.slice(0, 5), ...quarter]
}

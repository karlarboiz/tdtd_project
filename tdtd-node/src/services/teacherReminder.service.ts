import { randomUUID } from 'node:crypto'
import type { SqliteDatabase } from '../db/sqlite-types.js'
import type {
  AttendancePeriod,
  IsoDateString,
  TeacherReminderRow,
  TeacherReminderType,
} from '../schema/types.js'
import { HttpError } from '../errors/http-error.js'
import * as attendanceDao from '../dao/attendance.dao.js'
import * as reminderDao from '../dao/teacherReminder.dao.js'
import { isSchoolDayYmd } from '../lib/schoolDay.js'
import { getConfiguredTimezone, getTodayYmdInTimezone } from '../lib/timezone.js'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const REMINDER_TYPE_ATTENDANCE: TeacherReminderType = 'ATTENDANCE_DUE'

function assertValidDate(date: string): IsoDateString {
  const d = date.trim()
  if (!DATE_RE.test(d)) {
    throw new HttpError(400, 'date must be YYYY-MM-DD')
  }
  return d
}

export function attendanceReminderMessage(period: AttendancePeriod): string {
  return period === 'AM'
    ? 'Take AM attendance for today.'
    : 'Take PM attendance for today.'
}

export function listActiveReminders(
  db: SqliteDatabase,
  userId: string,
  dateRaw?: unknown,
): TeacherReminderRow[] {
  let date: IsoDateString
  if (typeof dateRaw === 'string' && dateRaw.trim()) {
    date = assertValidDate(dateRaw)
  } else {
    date = getTodayYmdInTimezone(getConfiguredTimezone())
  }
  return reminderDao.listOpenForDate(db, userId, date)
}

export function dismissReminder(
  db: SqliteDatabase,
  userId: string,
  idRaw: string,
): TeacherReminderRow {
  const id = idRaw.trim()
  if (!id) throw new HttpError(400, 'id is required')
  const row = reminderDao.findById(db, id, userId)
  if (!row) throw new HttpError(404, 'reminder not found')
  if (row.status !== 'open') {
    return row
  }
  const resolvedAt = Date.now()
  reminderDao.updateStatus(db, userId, id, 'dismissed', resolvedAt)
  return { ...row, status: 'dismissed', resolvedAt }
}

export function resolveAttendanceReminder(
  db: SqliteDatabase,
  userId: string,
  date: IsoDateString,
  period: AttendancePeriod,
): void {
  reminderDao.resolveOpenByTypeDatePeriod(
    db,
    userId,
    REMINDER_TYPE_ATTENDANCE,
    date,
    period,
    Date.now(),
  )
}

/**
 * Idempotent attendance prompt sync (used by tdtd-batch and tests).
 * Opens a reminder when no session exists; resolves when session exists.
 */
export function syncAttendanceDueReminder(
  db: SqliteDatabase,
  userId: string,
  date: IsoDateString,
  period: AttendancePeriod,
): 'opened' | 'resolved' | 'unchanged' {
  const timeZone = getConfiguredTimezone()
  if (!isSchoolDayYmd(db, date, timeZone)) {
    return 'unchanged'
  }

  const session = attendanceDao.findSessionByDatePeriod(db, userId, date, period)
  if (session) {
    const open = reminderDao.findOpenByTypeDatePeriod(
      db,
      userId,
      REMINDER_TYPE_ATTENDANCE,
      date,
      period,
    )
    if (open) {
      resolveAttendanceReminder(db, userId, date, period)
      return 'resolved'
    }
    return 'unchanged'
  }

  const existing = reminderDao.findOpenByTypeDatePeriod(
    db,
    userId,
    REMINDER_TYPE_ATTENDANCE,
    date,
    period,
  )
  if (existing) return 'unchanged'

  const row: TeacherReminderRow = {
    id: randomUUID(),
    userId,
    type: REMINDER_TYPE_ATTENDANCE,
    date,
    period,
    status: 'open',
    message: attendanceReminderMessage(period),
    createdAt: Date.now(),
  }
  try {
    reminderDao.insertReminder(db, row)
    return 'opened'
  } catch (e) {
    /** Concurrent open insert — unique partial index */
    const again = reminderDao.findOpenByTypeDatePeriod(
      db,
      userId,
      REMINDER_TYPE_ATTENDANCE,
      date,
      period,
    )
    if (again) return 'unchanged'
    throw e
  }
}

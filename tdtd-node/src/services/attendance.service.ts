import { randomUUID } from 'node:crypto'
import type { SqliteDatabase } from '../db/sqlite-types.js'
import type {
  AttendancePeriod,
  AttendanceSessionRow,
  IsoDateString,
  StudentRow,
} from '../schema/types.js'
import { HttpError } from '../errors/http-error.js'
import { getConfiguredTimezone, isWeekendYmd } from '../lib/timezone.js'
import * as attendanceDao from '../dao/attendance.dao.js'
import * as studentDao from '../dao/student.dao.js'
import { ACTIVITY_ACTION, recordActivity } from './activityLog.service.js'
import { resolveAttendanceReminder } from './teacherReminder.service.js'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/** Max inclusive span for session-dates range queries (about one leap year). */
const SESSION_DATES_MAX_SPAN_DAYS = 366

function assertValidDate(date: string): IsoDateString {
  const d = date.trim()
  if (!DATE_RE.test(d)) {
    throw new HttpError(400, 'date must be YYYY-MM-DD')
  }
  return d
}

function assertPeriod(p: string): AttendancePeriod {
  if (p === 'AM' || p === 'PM') return p
  throw new HttpError(400, 'period must be AM or PM')
}

function assertWeekday(date: IsoDateString): void {
  if (isWeekendYmd(date, getConfiguredTimezone())) {
    throw new HttpError(400, 'attendance is not recorded on weekends')
  }
}

function parseYmdOrThrow(raw: string, label: string): IsoDateString {
  const d = raw.trim()
  if (!DATE_RE.test(d)) {
    throw new HttpError(400, `${label} must be YYYY-MM-DD`)
  }
  return d
}

/** Compare ISO calendar dates (YYYY-MM-DD) lexicographically — valid for Gregorian ISO strings. */
function ymdDaysBetweenInclusive(from: string, to: string): number {
  const a = new Date(from + 'T12:00:00')
  const b = new Date(to + 'T12:00:00')
  const ms = b.getTime() - a.getTime()
  return Math.floor(ms / (24 * 60 * 60 * 1000)) + 1
}

export function listAttendanceSessionDatesInRange(
  db: SqliteDatabase,
  fromRaw: string,
  toRaw: string,
): string[] {
  const from = parseYmdOrThrow(fromRaw, 'from')
  const to = parseYmdOrThrow(toRaw, 'to')
  if (from > to) {
    throw new HttpError(400, 'from must be on or before to')
  }
  const span = ymdDaysBetweenInclusive(from, to)
  if (span > SESSION_DATES_MAX_SPAN_DAYS) {
    throw new HttpError(
      400,
      `date range cannot exceed ${SESSION_DATES_MAX_SPAN_DAYS} days`,
    )
  }
  return attendanceDao.listDistinctSessionDatesInRange(db, from, to)
}

export type PresentAttendanceRosterResult = {
  session: AttendanceSessionRow | null
  /** Students with a present record in this session (date + period). */
  presentStudents: StudentRow[]
}

export function getPresentAttendanceRoster(
  db: SqliteDatabase,
  dateRaw: string,
  periodRaw: string,
): PresentAttendanceRosterResult {
  const date = assertValidDate(dateRaw)
  const period = assertPeriod(periodRaw)
  const session = attendanceDao.findSessionByDatePeriod(db, date, period)
  if (!session) {
    return { session: null, presentStudents: [] }
  }
  const presentStudents = attendanceDao.listPresentStudentsForSession(db, session.id)
  return { session, presentStudents }
}

export type AttendanceStateResult = {
  session: AttendanceSessionRow | null
  presentStudentIds: string[]
}

export function getAttendanceState(
  db: SqliteDatabase,
  dateRaw: string,
  periodRaw: string,
  classIdRaw: string,
): AttendanceStateResult {
  const date = assertValidDate(dateRaw)
  const period = assertPeriod(periodRaw)
  const classId = classIdRaw.trim()
  if (!classId) throw new HttpError(400, 'classId is required')
  if (!studentDao.classExists(db, classId)) {
    throw new HttpError(404, 'class not found')
  }

  const students = studentDao.listStudentsByClass(db, classId)
  const ids = students.map((s) => s.id)
  const session = attendanceDao.findSessionByDatePeriod(db, date, period)
  if (!session) {
    return { session: null, presentStudentIds: [] }
  }
  const present = attendanceDao.selectPresentStudentIds(db, session.id, ids)
  return { session, presentStudentIds: [...present] }
}

export type SaveAttendanceInput = {
  date: string
  period: string
  classStudentIds: string[]
  presentStudentIds: string[]
}

export function saveAttendance(db: SqliteDatabase, input: SaveAttendanceInput): AttendanceSessionRow {
  const date = assertValidDate(input.date)
  assertWeekday(date)
  const period = assertPeriod(input.period)
  const classIds = [...new Set(input.classStudentIds.map((id) => id.trim()))].filter(
    Boolean,
  )
  const presentRequested = [...new Set(input.presentStudentIds.map((id) => id.trim()))].filter(
    Boolean,
  )

  const allowed = new Set(classIds)
  const presentFiltered = presentRequested.filter((id) => allowed.has(id))

  let session = attendanceDao.findSessionByDatePeriod(db, date, period)
  if (!session) {
    const row: AttendanceSessionRow = {
      id: randomUUID(),
      date,
      period,
      createdAt: Date.now(),
    }
    try {
      attendanceDao.insertSession(db, row)
      session = row
    } catch (e) {
      /** Concurrent create: UNIQUE(date, period) — load existing */
      session = attendanceDao.findSessionByDatePeriod(db, date, period)
      if (!session) throw e
    }
  }

  const run = db.transaction(() => {
    attendanceDao.deleteRecordsForStudentsInSession(db, session!.id, classIds)
    const ts = Date.now()
    for (const studentId of presentFiltered) {
      attendanceDao.insertAttendanceRecord(
        db,
        randomUUID(),
        session!.id,
        studentId,
        ts,
      )
    }
  })
  run()

  recordActivity(db, {
    action: ACTIVITY_ACTION.ATTENDANCE_SAVED,
    summary: `Saved ${period} attendance for ${date} (${presentFiltered.length} present)`,
    metadata: {
      date,
      period,
      count: presentFiltered.length,
    },
  })

  resolveAttendanceReminder(db, date, period)

  return session
}

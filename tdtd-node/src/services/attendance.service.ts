import { randomUUID } from 'node:crypto'
import type { SqliteDatabase } from '../db/sqlite-types.js'
import type {
  AttendancePeriod,
  AttendanceRecordStatus,
  AttendanceSessionRow,
  IsoDateString,
} from '../schema/types.js'
import { HttpError } from '../errors/http-error.js'
import { isSchoolDayYmd } from '../lib/schoolDay.js'
import { assertClassOwned, assertStudentOwned } from '../lib/ownership.js'
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

function assertSchoolDay(db: SqliteDatabase, date: IsoDateString): void {
  if (!isSchoolDayYmd(db, date)) {
    throw new HttpError(400, 'attendance is not recorded on non-school days')
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
  userId: string,
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
  return attendanceDao.listDistinctSessionDatesInRange(db, userId, from, to)
}

export type AttendanceRosterResult = {
  session: AttendanceSessionRow | null
  /** Every student with a stored status in this session (date + period). */
  students: attendanceDao.AttendanceRosterStudentRow[]
}

export function getAttendanceRoster(
  db: SqliteDatabase,
  userId: string,
  dateRaw: string,
  periodRaw: string,
): AttendanceRosterResult {
  const date = assertValidDate(dateRaw)
  const period = assertPeriod(periodRaw)
  const session = attendanceDao.findSessionByDatePeriod(db, userId, date, period)
  if (!session) {
    return { session: null, students: [] }
  }
  const students = attendanceDao.listRosterStudentsForSession(
    db,
    userId,
    session.id,
  )
  return { session, students }
}

export type AttendanceMark = {
  studentId: string
  status: AttendanceRecordStatus
}

export type AttendanceStateResult = {
  session: AttendanceSessionRow | null
  marks: AttendanceMark[]
}

export function getAttendanceState(
  db: SqliteDatabase,
  userId: string,
  dateRaw: string,
  periodRaw: string,
  classIdRaw: string,
): AttendanceStateResult {
  const date = assertValidDate(dateRaw)
  const period = assertPeriod(periodRaw)
  const classId = classIdRaw.trim()
  if (!classId) throw new HttpError(400, 'classId is required')
  assertClassOwned(db, classId, userId)

  const students = studentDao.listStudentsByClass(db, classId)
  const ids = students.map((s) => s.id)
  const session = attendanceDao.findSessionByDatePeriod(db, userId, date, period)
  if (!session) {
    return { session: null, marks: [] }
  }
  const marks = attendanceDao.selectAttendanceMarks(db, session.id, ids)
  return { session, marks }
}

export type SaveAttendanceMarkInput = {
  studentId: string
  status: string
}

export type SaveAttendanceInput = {
  date: string
  period: string
  classStudentIds: string[]
  marks: SaveAttendanceMarkInput[]
}

function assertStatus(raw: string): AttendanceRecordStatus {
  const status = raw.trim()
  if (
    status === 'present' ||
    status === 'absent' ||
    status === 'late' ||
    status === 'excused'
  ) {
    return status
  }
  throw new HttpError(400, 'status must be present, absent, late, or excused')
}

export function saveAttendance(
  db: SqliteDatabase,
  userId: string,
  input: SaveAttendanceInput,
): AttendanceSessionRow {
  const date = assertValidDate(input.date)
  assertSchoolDay(db, date)
  const period = assertPeriod(input.period)
  const classIds = [...new Set(input.classStudentIds.map((id) => id.trim()))].filter(
    Boolean,
  )
  for (const studentId of classIds) {
    assertStudentOwned(db, studentId, userId)
  }

  const allowed = new Set(classIds)
  const byStudent = new Map<string, AttendanceRecordStatus>()

  for (const mark of input.marks) {
    const studentId = mark.studentId.trim()
    if (!studentId || !allowed.has(studentId)) continue
    const status = assertStatus(mark.status)
    const previous = byStudent.get(studentId)
    if (previous && previous !== status) {
      throw new HttpError(400, 'each student must have one status')
    }
    byStudent.set(studentId, status)
  }

  for (const studentId of classIds) {
    if (!byStudent.has(studentId)) {
      throw new HttpError(
        400,
        'every student in the class needs a status of present, absent, late, or excused',
      )
    }
  }

  let session = attendanceDao.findSessionByDatePeriod(db, userId, date, period)
  if (!session) {
    const row: AttendanceSessionRow = {
      id: randomUUID(),
      userId,
      date,
      period,
      createdAt: Date.now(),
    }
    try {
      attendanceDao.insertSession(db, row)
      session = row
    } catch (e) {
      /** Concurrent create: UNIQUE(user_id, date, period) — load existing */
      session = attendanceDao.findSessionByDatePeriod(db, userId, date, period)
      if (!session) throw e
    }
  }

  const run = db.transaction(() => {
    attendanceDao.deleteRecordsForStudentsInSession(db, session!.id, classIds)
    const ts = Date.now()
    for (const studentId of classIds) {
      attendanceDao.insertAttendanceRecord(
        db,
        randomUUID(),
        session!.id,
        studentId,
        byStudent.get(studentId)!,
        ts,
      )
    }
  })
  run()

  let presentCount = 0
  let absentCount = 0
  let lateCount = 0
  let excusedCount = 0
  for (const status of byStudent.values()) {
    if (status === 'present') presentCount += 1
    else if (status === 'absent') absentCount += 1
    else if (status === 'late') lateCount += 1
    else excusedCount += 1
  }

  recordActivity(db, userId, {
    action: ACTIVITY_ACTION.ATTENDANCE_SAVED,
    summary: `Saved ${period} attendance for ${date} (${presentCount} present, ${absentCount} absent, ${lateCount} late, ${excusedCount} excused)`,
    metadata: {
      date,
      period,
      count: classIds.length,
    },
  })

  resolveAttendanceReminder(db, userId, date, period)

  return session
}

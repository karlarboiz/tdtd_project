import type { SqliteDatabase } from '../db/sqlite-types.js'
import type {
  AttendancePeriod,
  AttendanceRecordStatus,
  AttendanceSessionRow,
  StudentGenderCode,
  StudentRow,
} from '../schema/types.js'
import { ATTENDANCE_QUERIES } from '../queries/attendance.queries.js'

type SessionDbRow = {
  id: string
  user_id: string
  date: string
  period: AttendancePeriod
  created_at: number
}

function mapSession(row: SessionDbRow): AttendanceSessionRow {
  return {
    id: row.id,
    userId: row.user_id,
    date: row.date,
    period: row.period,
    createdAt: row.created_at,
  }
}

export function findSessionByDatePeriod(
  db: SqliteDatabase,
  userId: string,
  date: string,
  period: AttendancePeriod,
): AttendanceSessionRow | undefined {
  const row = db
    .prepare(ATTENDANCE_QUERIES.sessionByDatePeriod)
    .get(userId, date, period) as SessionDbRow | undefined
  return row ? mapSession(row) : undefined
}

export function getSessionById(
  db: SqliteDatabase,
  sessionId: string,
  userId: string,
): AttendanceSessionRow | undefined {
  const row = db
    .prepare(ATTENDANCE_QUERIES.sessionById)
    .get(sessionId, userId) as SessionDbRow | undefined
  return row ? mapSession(row) : undefined
}

export function insertSession(db: SqliteDatabase, row: AttendanceSessionRow): void {
  db.prepare(ATTENDANCE_QUERIES.sessionInsert).run({
    id: row.id,
    user_id: row.userId,
    date: row.date,
    period: row.period,
    created_at: row.createdAt,
  })
}

/** Build `IN (?,?,...)` fragment; returns empty string if ids is empty (caller must skip). */
export function expandInPlaceholders(count: number): string {
  return Array(count).fill('?').join(', ')
}

export type AttendanceMarkRow = {
  studentId: string
  status: AttendanceRecordStatus
}

export function selectAttendanceMarks(
  db: SqliteDatabase,
  sessionId: string,
  studentIds: string[],
): AttendanceMarkRow[] {
  if (studentIds.length === 0) return []
  const ph = expandInPlaceholders(studentIds.length)
  const sql = ATTENDANCE_QUERIES.marksForStudents.replace('%IDS%', ph)
  const rows = db.prepare(sql).all(sessionId, ...studentIds) as {
    student_id: string
    status: AttendanceRecordStatus
  }[]
  return rows.map((r) => ({ studentId: r.student_id, status: r.status }))
}

export function deleteRecordsForStudentsInSession(
  db: SqliteDatabase,
  sessionId: string,
  studentIds: string[],
): void {
  if (studentIds.length === 0) return
  const ph = expandInPlaceholders(studentIds.length)
  const sql = ATTENDANCE_QUERIES.deleteRecordsForStudents.replace('%IDS%', ph)
  db.prepare(sql).run(sessionId, ...studentIds)
}

export function insertAttendanceRecord(
  db: SqliteDatabase,
  id: string,
  sessionId: string,
  studentId: string,
  status: AttendanceRecordStatus,
  timestamp: number,
): void {
  db.prepare(ATTENDANCE_QUERIES.recordInsert).run({
    id,
    session_id: sessionId,
    student_id: studentId,
    status,
    timestamp,
  })
}

export function listDistinctSessionDatesInRange(
  db: SqliteDatabase,
  userId: string,
  from: string,
  to: string,
): string[] {
  const rows = db
    .prepare(ATTENDANCE_QUERIES.distinctSessionDatesInRange)
    .all(userId, from, to) as { date: string }[]
  return rows.map((r) => r.date)
}

export function listSessionsInRange(
  db: SqliteDatabase,
  userId: string,
  from: string,
  to: string,
): { date: string; period: AttendancePeriod }[] {
  const rows = db
    .prepare(ATTENDANCE_QUERIES.sessionsInRange)
    .all(userId, from, to) as { date: string; period: AttendancePeriod }[]
  return rows
}

type RosterStudentDbRow = {
  id: string
  first_name: string
  middle_name: string | null
  last_name: string
  birth_date: string
  gender: StudentGenderCode
  class_id: string
  created_at: number
  status: AttendanceRecordStatus
}

export type AttendanceRosterStudentRow = StudentRow & {
  status: AttendanceRecordStatus
}

export function listRosterStudentsForSession(
  db: SqliteDatabase,
  userId: string,
  sessionId: string,
): AttendanceRosterStudentRow[] {
  const rows = db
    .prepare(ATTENDANCE_QUERIES.rosterStudentsForSession)
    .all(userId, sessionId) as RosterStudentDbRow[]
  return rows.map((r) => ({
    id: r.id,
    firstName: r.first_name,
    middleName: r.middle_name ?? undefined,
    lastName: r.last_name,
    birthDate: r.birth_date,
    gender: r.gender,
    classId: r.class_id,
    createdAt: r.created_at,
    status: r.status,
  }))
}

import type { SqliteDatabase } from '../db/sqlite-types.js'
import type {
  AttendancePeriod,
  AttendanceSessionRow,
  StudentGenderCode,
  StudentRow,
} from '../schema/types.js'
import { ATTENDANCE_QUERIES } from '../queries/attendance.queries.js'

type SessionDbRow = {
  id: string
  date: string
  period: AttendancePeriod
  created_at: number
}

function mapSession(row: SessionDbRow): AttendanceSessionRow {
  return {
    id: row.id,
    date: row.date,
    period: row.period,
    createdAt: row.created_at,
  }
}

export function findSessionByDatePeriod(
  db: SqliteDatabase,
  date: string,
  period: AttendancePeriod,
): AttendanceSessionRow | undefined {
  const row = db.prepare(ATTENDANCE_QUERIES.sessionByDatePeriod).get(date, period) as
    | SessionDbRow
    | undefined
  return row ? mapSession(row) : undefined
}

export function insertSession(db: SqliteDatabase, row: AttendanceSessionRow): void {
  db.prepare(ATTENDANCE_QUERIES.sessionInsert).run({
    id: row.id,
    date: row.date,
    period: row.period,
    created_at: row.createdAt,
  })
}

/** Build `IN (?,?,...)` fragment; returns empty string if ids is empty (caller must skip). */
export function expandInPlaceholders(count: number): string {
  return Array(count).fill('?').join(', ')
}

export function selectPresentStudentIds(
  db: SqliteDatabase,
  sessionId: string,
  studentIds: string[],
): Set<string> {
  if (studentIds.length === 0) return new Set()
  const ph = expandInPlaceholders(studentIds.length)
  const sql = ATTENDANCE_QUERIES.presentStudentIds.replace('%IDS%', ph)
  const rows = db.prepare(sql).all(sessionId, ...studentIds) as { student_id: string }[]
  return new Set(rows.map((r) => r.student_id))
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
  timestamp: number,
): void {
  db.prepare(ATTENDANCE_QUERIES.recordInsert).run({
    id,
    session_id: sessionId,
    student_id: studentId,
    status: 'present',
    timestamp,
  })
}

export function listDistinctSessionDatesInRange(
  db: SqliteDatabase,
  from: string,
  to: string,
): string[] {
  const rows = db
    .prepare(ATTENDANCE_QUERIES.distinctSessionDatesInRange)
    .all(from, to) as { date: string }[]
  return rows.map((r) => r.date)
}

type PresentStudentDbRow = {
  id: string
  first_name: string
  middle_name: string | null
  last_name: string
  birth_date: string
  gender: StudentGenderCode
  class_id: string
  created_at: number
}

export function listPresentStudentsForSession(
  db: SqliteDatabase,
  sessionId: string,
): StudentRow[] {
  const rows = db
    .prepare(ATTENDANCE_QUERIES.presentStudentsForSession)
    .all(sessionId) as PresentStudentDbRow[]
  return rows.map((r) => ({
    id: r.id,
    firstName: r.first_name,
    middleName: r.middle_name ?? undefined,
    lastName: r.last_name,
    birthDate: r.birth_date,
    gender: r.gender,
    classId: r.class_id,
    createdAt: r.created_at,
  }))
}

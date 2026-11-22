import type { SqliteDatabase } from '../db/sqlite-types.js'
import { HttpError } from '../errors/http-error.js'
import * as classDao from '../dao/class.dao.js'
import * as studentDao from '../dao/student.dao.js'
import * as attendanceDao from '../dao/attendance.dao.js'
import * as scoreEventDao from '../dao/scoreEvent.dao.js'
import type { ClassRow, StudentRow, AttendanceSessionRow, ScoreEventRow, SchoolYearRow } from '../schema/types.js'
import * as schoolYearDao from '../dao/schoolYear.dao.js'

export function assertClassOwned(
  db: SqliteDatabase,
  classId: string,
  userId: string,
): ClassRow {
  const row = classDao.getClassById(db, classId, userId)
  if (!row) throw new HttpError(404, 'Class not found')
  return row
}

export function assertStudentOwned(
  db: SqliteDatabase,
  studentId: string,
  userId: string,
): StudentRow {
  const row = studentDao.getStudentByIdForUser(db, studentId, userId)
  if (!row) throw new HttpError(404, 'Student not found')
  return row
}

export function assertSessionOwned(
  db: SqliteDatabase,
  sessionId: string,
  userId: string,
): AttendanceSessionRow {
  const row = attendanceDao.getSessionById(db, sessionId, userId)
  if (!row) throw new HttpError(404, 'Attendance session not found')
  return row
}

export function assertScoreEventOwned(
  db: SqliteDatabase,
  eventId: string,
  userId: string,
): ScoreEventRow {
  const row = scoreEventDao.getScoreEventByIdForUser(db, eventId, userId)
  if (!row) throw new HttpError(404, 'Score event not found')
  return row
}

export function assertSchoolYearOwned(
  db: SqliteDatabase,
  schoolYearId: string,
  userId: string,
): SchoolYearRow {
  const id = schoolYearId.trim()
  if (!id) throw new HttpError(400, 'schoolYearId is required')
  const row = schoolYearDao.getSchoolYearById(db, id, userId)
  if (!row) throw new HttpError(404, 'school year not found')
  return row
}

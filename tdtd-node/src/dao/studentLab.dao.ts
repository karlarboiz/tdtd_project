import type { SqliteDatabase } from '../db/sqlite-types.js'
import type {
  AttendancePeriod,
  ClassShift,
  ScoreEventKind,
} from '../schema/types.js'
import { STUDENT_LAB_QUERIES } from '../queries/studentLab.queries.js'

export type StudentLabAttendanceDbRow = {
  date: string
  period: AttendancePeriod
  status: 'present' | 'absent'
}

export type StudentLabScoreDbRow = {
  event_id: string
  kind: ScoreEventKind
  title: string
  subject_name: string
  event_date: string | null
  max_score: number | null
  event_created_at: number
  score: number
  recorded_at: number
}

export function listAttendanceSessionsForStudent(
  db: SqliteDatabase,
  studentId: string,
  classShift: ClassShift,
  dateFilter: { from: string; to: string } | null,
): StudentLabAttendanceDbRow[] {
  const useDates = dateFilter !== null ? 1 : 0
  const from = dateFilter?.from ?? ''
  const to = dateFilter?.to ?? ''
  return db
    .prepare(STUDENT_LAB_QUERIES.attendanceSessionsForStudent)
    .all(studentId, classShift, classShift, useDates, from, to) as StudentLabAttendanceDbRow[]
}

export function listScoresForStudent(
  db: SqliteDatabase,
  studentId: string,
  classId: string,
  kind: ScoreEventKind,
  dateFilter: { from: string; to: string } | null,
): StudentLabScoreDbRow[] {
  const useDates = dateFilter !== null ? 1 : 0
  const from = dateFilter?.from ?? ''
  const to = dateFilter?.to ?? ''
  return db
    .prepare(STUDENT_LAB_QUERIES.scoresForStudent)
    .all(studentId, classId, kind, useDates, from, to) as StudentLabScoreDbRow[]
}

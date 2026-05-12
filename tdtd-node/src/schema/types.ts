/**
 * Teacher Attendance App — API / database row shapes (SQLite in tdtd-node).
 * Source of truth: Schema-Rules.md; scores: Score-Function-Schema-Rules.md
 */

/** Morning or afternoon attendance slot (session / wall-clock). */
export type AttendancePeriod = 'AM' | 'PM'

/** Class schedule half-day: morning or afternoon section. */
export type ClassShift = 'MRNG' | 'AFTNN'

/** Stored gender code for students. */
export type StudentGenderCode = 'M' | 'F' | 'O'

/** MVP: only "present"; absence = no record. */
export type AttendanceRecordStatus = 'present'

/** Calendar date key: YYYY-MM-DD */
export type IsoDateString = string

/**
 * classes — a group of students (e.g. Grade 5).
 * Do not embed students.
 */
export interface ClassRow {
  id: string
  name: string
  shift: ClassShift
  createdAt: number
  updatedAt?: number
}

/**
 * students — one class per student.
 * Do not store attendance on this row.
 */
export interface StudentRow {
  id: string
  firstName: string
  middleName?: string
  lastName: string
  birthDate: IsoDateString
  gender: StudentGenderCode
  /** FK → ClassRow.id */
  classId: string
  createdAt: number
}

/**
 * attendance_sessions — one global session per date + period (no classId).
 */
export interface AttendanceSessionRow {
  id: string
  date: IsoDateString
  period: AttendancePeriod
  createdAt: number
}

/**
 * attendance_records — at most one row per student per session.
 */
export interface AttendanceRecordRow {
  id: string
  /** FK → AttendanceSessionRow.id */
  sessionId: string
  /** FK → StudentRow.id */
  studentId: string
  status: AttendanceRecordStatus
  timestamp: number
}

/** Quiz, long test, or participation recording. */
export type ScoreEventKind = 'QUIZ' | 'EXAM' | 'PARTICIPATION'

export interface SubjectRow {
  id: string
  name: string
  shortCode?: string
  createdAt: number
  updatedAt?: number
}

/** FK → ClassRow.id, SubjectRow.id */
export interface ClassSubjectRow {
  id: string
  classId: string
  subjectId: string
  createdAt: number
}

export interface ScoreEventRow {
  id: string
  classId: string
  subjectId: string
  kind: ScoreEventKind
  title: string
  date?: IsoDateString
  maxScore?: number
  createdAt: number
  updatedAt?: number
}

export interface ScoreEntryRow {
  id: string
  eventId: string
  studentId: string
  score: number | null
  note?: string
  recordedAt: number
}

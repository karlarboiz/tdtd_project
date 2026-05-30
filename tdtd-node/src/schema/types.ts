/**
 * Teacher's Dilemma Today — API / database row shapes (SQLite in tdtd-node).
 * Source of truth: .cursor/schemas/core.md, attendance.md, subjects.md, quiz.md
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

export interface SchoolYearRow {
  id: string
  label: string
  startDate?: IsoDateString
  endDate?: IsoDateString
  isActive: boolean
  createdAt: number
  updatedAt?: number
}

export interface SubjectRow {
  id: string
  name: string
  shortCode?: string
  createdAt: number
  updatedAt?: number
}

/** FK → SchoolYearRow.id, SubjectRow.id */
export interface SchoolYearSubjectRow {
  id: string
  schoolYearId: string
  subjectId: string
  /** e.g. "Grade 5", "6", "Kinder" */
  gradeLevel: string
  createdAt: number
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

/** Optional JSON payload for deep links and context (see .cursor/schemas/recents.md). */
export type ActivityLogMetadata = {
  classId?: string
  studentId?: string
  eventId?: string
  schoolYearId?: string
  date?: IsoDateString
  period?: AttendancePeriod
  count?: number
}

/**
 * activity_logs — teacher activity recents (append-only).
 * No FKs; metadata may reference entities that are later deleted.
 */
export interface ActivityLogRow {
  id: string
  action: string
  summary: string
  metadata?: ActivityLogMetadata
  createdAt: number
}

/** Student Lab — attendance row in session list. */
export type StudentLabAttendanceStatus = 'present' | 'absent'

export interface StudentLabAttendanceSessionRow {
  date: IsoDateString
  period: AttendancePeriod
  status: StudentLabAttendanceStatus
}

export interface StudentLabAttendanceSummary {
  totalSessions: number
  presentCount: number
  absentCount: number
  presentRate: number
}

export interface StudentLabScoreRow {
  eventId: string
  kind: ScoreEventKind
  title: string
  subjectName: string
  date?: IsoDateString
  score: number
  maxScore?: number
  recordedAt: number
}

export interface StudentLabProfile {
  student: StudentRow
  class: ClassRow
}

/** Prompt types written by tdtd-batch or API (not Recents history). */
export type TeacherReminderType = 'ATTENDANCE_DUE'

export type TeacherReminderStatus = 'open' | 'dismissed' | 'resolved'

export interface TeacherReminderRow {
  id: string
  type: TeacherReminderType
  date: IsoDateString
  period: AttendancePeriod
  status: TeacherReminderStatus
  message: string
  createdAt: number
  resolvedAt?: number
}

/** DueList row shown to teachers (maps from teacher_reminders in v1). */
export type DueItemKind = 'ATTENDANCE_DUE'

export interface DueItem {
  id: string
  kind: DueItemKind
  title: string
  message: string
  date: IsoDateString
  period?: AttendancePeriod
  actionPath: string
  createdAt: number
}

export interface StudentLabPayload {
  profile: StudentLabProfile
  attendance: {
    summary: StudentLabAttendanceSummary
    sessions: StudentLabAttendanceSessionRow[]
  }
  scores: {
    recentQuizzes: StudentLabScoreRow[]
    recentExams: StudentLabScoreRow[]
    recentParticipation: StudentLabScoreRow[]
  }
}

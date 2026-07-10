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

/** DepEd attendance status codes (GAP-088). */
export type AttendanceRecordStatus = 'present' | 'absent' | 'late' | 'excused'

/** DepEd assessment bucket for grading (GAP-081). */
export type AssessmentBucket = 'WW' | 'PT' | 'QA'

/** Learner enrollment status. */
export type LearnerStatus = 'NEW' | 'TRANSFEREE' | 'CONTINUING'

/** Promotion decision for SF5/SF10. */
export type PromotionStatus = 'PROMOTED' | 'CONDITIONAL' | 'RETAINED'

/** Calendar date key: YYYY-MM-DD */
export type IsoDateString = string

/**
 * classes — a group of students (e.g. Grade 5).
 * Do not embed students.
 */
export interface ClassRow {
  id: string
  userId: string
  name: string
  shift: ClassShift
  gradeLevel?: string
  sectionName?: string
  classAdviserName?: string
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
  classId: string
  lrn?: string
  learnerStatus?: LearnerStatus
  houseNo?: string
  street?: string
  barangay?: string
  cityMunicipality?: string
  province?: string
  fatherName?: string
  motherName?: string
  guardianName?: string
  parentContact?: string
  motherTongue?: string
  religion?: string
  is4ps?: boolean
  isIp?: boolean
  dateEnrolled?: IsoDateString
  previousSchool?: string
  lastGradeCompleted?: string
  createdAt: number
}

export interface SchoolSettingsRow {
  id: string
  userId: string
  schoolName: string
  schoolId?: string
  district?: string
  division?: string
  region?: string
  schoolAddress?: string
  schoolHeadName?: string
  defaultSchoolYearId?: string
  updatedAt: number
}

/** Grading system profile — WW/PT/QA weights per grade band (GAP-103). */
export interface GradingSystemRow {
  id: string
  userId: string
  name: string
  isActive: boolean
  createdAt: number
  updatedAt: number
}

export interface GradingComponentWeightRow {
  id: string
  gradingSystemId: string
  gradeBandMin: number
  gradeBandMax: number
  wwWeight: number
  ptWeight: number
  qaWeight: number
}

/** API payload: weights as display percents (0–100). */
export interface GradingWeightBandInput {
  gradeBandMin: number
  gradeBandMax: number
  ww: number
  pt: number
  qa: number
}

export interface GradingWeightBandDisplay extends GradingWeightBandInput {
  label: string
}

export interface DailyAttendanceRecordRow {
  id: string
  studentId: string
  date: IsoDateString
  status: AttendanceRecordStatus
  classId: string
  updatedAt: number
}

export interface ComputedSubjectGradeRow {
  id: string
  studentId: string
  subjectId: string
  classId: string
  schoolYearId: string
  quarter: number
  transmutedGrade?: number
  descriptor?: string
  finalGrade?: number
  manualOverride: boolean
  computedAt: number
}

export interface EnrollmentHistoryRow {
  id: string
  studentId: string
  schoolYearId: string
  gradeLevel: string
  sectionName?: string
  schoolName: string
  gradesSnapshotJson?: string
  promotionStatus?: PromotionStatus
  archivedAt: number
}
export interface AttendanceSessionRow {
  id: string
  userId: string
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
  userId: string
  label: string
  startDate?: IsoDateString
  endDate?: IsoDateString
  isActive: boolean
  createdAt: number
  updatedAt?: number
}

export interface SubjectRow {
  id: string
  userId: string
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
  quarter?: number
  assessmentBucket?: AssessmentBucket
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
  userId: string
  action: string
  summary: string
  metadata?: ActivityLogMetadata
  createdAt: number
}

/** Student Lab — attendance row in session list. */
export type StudentLabAttendanceStatus = AttendanceRecordStatus | 'absent'

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
  userId: string
  type: TeacherReminderType
  date: IsoDateString
  period: AttendancePeriod
  status: TeacherReminderStatus
  message: string
  createdAt: number
  resolvedAt?: number
}

/** DueList row shown to teachers (maps from teacher_reminders in v1). */
export type DueItemKind = 'ATTENDANCE_DUE' | 'QUARTER_DEADLINE'

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

/** users.role — see .cursor/schemas/auth.md */
export type UserRole = 'admin' | 'teacher'

export interface UserRow {
  id: string
  firstName: string
  lastName: string
  email: string
  emailNormalized: string
  passwordHash: string
  role: UserRole
  isActive: boolean
  passwordChangedAt: number
  createdAt: number
  updatedAt?: number
}

export interface PasswordResetTokenRow {
  id: string
  userId: string
  tokenHash: string
  expiresAt: number
  usedAt?: number
  createdAt: number
}

export interface RefreshTokenRow {
  id: string
  userId: string
  tokenHash: string
  expiresAt: number
  revokedAt?: number
  createdAt: number
  replacedByTokenId?: string
}

/** Safe user shape returned from auth APIs (no secrets). */
export interface AuthUser {
  id: string
  firstName: string
  lastName: string
  email: string
  role: UserRole
  isActive: boolean
  passwordChangedAt: number
  mustChangePassword: boolean
  passwordExpiresAt: number
}

export interface AuthTokensResponse {
  accessToken: string
  refreshToken: string
  user: AuthUser
}

/** Philippine government holiday classification from Official Gazette proclamations. */
export type GovernmentHolidayType =
  | 'REGULAR'
  | 'SPECIAL_NON_WORKING'
  | 'SPECIAL_WORKING'

export interface GovernmentHolidayRow {
  date: IsoDateString
  name: string
  type: GovernmentHolidayType
  year: number
  proclamation?: string
  sourceUrl?: string
  fetchedAt: number
}

/** Domain types aligned with tdtd-node / .cursor/schemas (core, attendance, subjects, quiz) */

export type AttendancePeriod = 'AM' | 'PM'

export type ClassShift = 'MRNG' | 'AFTNN'

export type StudentGenderCode = 'M' | 'F' | 'O'

export interface ClassRow {
  id: string
  name: string
  shift: ClassShift
  createdAt: number
  updatedAt?: number
}

export interface StudentRow {
  id: string
  firstName: string
  middleName?: string
  lastName: string
  birthDate: string
  gender: StudentGenderCode
  classId: string
  createdAt: number
}

/** Payload for create / bulk-import (no id / classId until sent). */
export type StudentUpsertPayload = {
  firstName: string
  middleName?: string
  lastName: string
  birthDate: string
  gender: string
}

export interface AttendanceSessionRow {
  id: string
  date: string
  period: AttendancePeriod
  createdAt: number
}

export type ScoreEventKind = 'QUIZ' | 'EXAM' | 'PARTICIPATION'

export interface SchoolYearRow {
  id: string
  label: string
  startDate?: string
  endDate?: string
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

export interface SchoolYearSubjectRow {
  id: string
  schoolYearId: string
  subjectId: string
  gradeLevel: string
  createdAt: number
  subjectName: string
  subjectShortCode?: string
}

export interface ClassSubjectRow {
  id: string
  classId: string
  subjectId: string
  createdAt: number
  subjectName: string
  subjectShortCode?: string
}

export interface ScoreEventRow {
  id: string
  classId: string
  subjectId: string
  kind: ScoreEventKind
  title: string
  date?: string
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

export type ActivityLogMetadata = {
  classId?: string
  studentId?: string
  eventId?: string
  schoolYearId?: string
  date?: string
  period?: 'AM' | 'PM'
  count?: number
}

export interface ActivityLogRow {
  id: string
  action: string
  summary: string
  metadata?: ActivityLogMetadata
  createdAt: number
}

export type StudentLabAttendanceStatus = 'present' | 'absent'

export interface StudentLabAttendanceSessionRow {
  date: string
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
  date?: string
  score: number
  maxScore?: number
  recordedAt: number
}

export interface StudentLabProfile {
  student: StudentRow
  class: ClassRow
}

export type TeacherReminderType = 'ATTENDANCE_DUE'

export type TeacherReminderStatus = 'open' | 'dismissed' | 'resolved'

export interface TeacherReminderRow {
  id: string
  type: TeacherReminderType
  date: string
  period: AttendancePeriod
  status: TeacherReminderStatus
  message: string
  createdAt: number
  resolvedAt?: number
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

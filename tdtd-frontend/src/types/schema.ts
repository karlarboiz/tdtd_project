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

/** Domain types aligned with tdtd-node / Schema-Rules.md */

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

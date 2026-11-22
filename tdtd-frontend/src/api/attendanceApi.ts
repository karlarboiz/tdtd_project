import type {
  AttendancePeriod,
  AttendanceRecordStatus,
  AttendanceSessionRow,
  StudentRow,
} from '@/types/schema'
import { apiJson } from '../lib/http'

export type AttendanceMark = {
  studentId: string
  status: AttendanceRecordStatus
}

export type AttendanceStateResponse = {
  session: AttendanceSessionRow | null
  marks: AttendanceMark[]
}

export type AttendanceRosterStudent = StudentRow & {
  status: AttendanceRecordStatus
}

export type AttendanceRosterResponse = {
  session: AttendanceSessionRow | null
  students: AttendanceRosterStudent[]
}

export function getAttendanceRoster(params: {
  date: string
  period: AttendancePeriod
}): Promise<AttendanceRosterResponse> {
  const q = new URLSearchParams({
    date: params.date,
    period: params.period,
  })
  return apiJson<AttendanceRosterResponse>(
    `/api/attendance/present-roster?${q.toString()}`,
  )
}

/** Same roster read. Reminder banners only check whether `session` is set. */
export const getAttendancePresentRoster = getAttendanceRoster

export function getAttendanceState(params: {
  date: string
  period: AttendancePeriod
  classId: string
}): Promise<AttendanceStateResponse> {
  const q = new URLSearchParams({
    date: params.date,
    period: params.period,
    classId: params.classId,
  })
  return apiJson<AttendanceStateResponse>(
    `/api/attendance/state?${q.toString()}`,
  )
}

export function saveAttendance(input: {
  date: string
  period: AttendancePeriod
  classStudentIds: string[]
  marks: AttendanceMark[]
}): Promise<{ session: AttendanceSessionRow }> {
  return apiJson<{ session: AttendanceSessionRow }>('/api/attendance/save', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export type AttendanceSessionDatesResponse = {
  dates: string[]
}

export function getAttendanceSessionDatesRange(params: {
  from: string
  to: string
}): Promise<AttendanceSessionDatesResponse> {
  const q = new URLSearchParams({
    from: params.from,
    to: params.to,
  })
  return apiJson<AttendanceSessionDatesResponse>(
    `/api/attendance/session-dates?${q.toString()}`,
  )
}

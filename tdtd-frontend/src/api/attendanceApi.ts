import type {
  AttendancePeriod,
  AttendanceSessionRow,
  StudentRow,
} from '../types/schema'
import { apiJson } from '../lib/http'

export type AttendanceStateResponse = {
  session: AttendanceSessionRow | null
  presentStudentIds: string[]
}

export type AttendancePresentRosterResponse = {
  session: AttendanceSessionRow | null
  presentStudents: StudentRow[]
}

export function getAttendancePresentRoster(params: {
  date: string
  period: AttendancePeriod
}): Promise<AttendancePresentRosterResponse> {
  const q = new URLSearchParams({
    date: params.date,
    period: params.period,
  })
  return apiJson<AttendancePresentRosterResponse>(
    `/api/attendance/present-roster?${q.toString()}`,
  )
}

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
  presentStudentIds: string[]
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

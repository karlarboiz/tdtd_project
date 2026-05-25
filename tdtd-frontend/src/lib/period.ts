import type { AttendancePeriod } from '@/types/schema'

/** Uses local wall clock — matches product spec for session header and save period. */
export function getCurrentPeriod(now = new Date()): AttendancePeriod {
  return now.getHours() < 12 ? 'AM' : 'PM'
}

export function otherAttendancePeriod(period: AttendancePeriod): AttendancePeriod {
  return period === 'AM' ? 'PM' : 'AM'
}

export function parseAttendancePeriod(
  raw: string | null | undefined,
): AttendancePeriod | null {
  if (raw === 'AM' || raw === 'PM') return raw
  return null
}

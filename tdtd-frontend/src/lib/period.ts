import type { AttendancePeriod } from '@/types/schema'

/** Uses local wall clock — matches product spec for session header and save period. */
export function getCurrentPeriod(now = new Date()): AttendancePeriod {
  return now.getHours() < 12 ? 'AM' : 'PM'
}

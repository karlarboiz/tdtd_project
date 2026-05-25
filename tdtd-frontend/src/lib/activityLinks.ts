import type { ActivityLogMetadata } from '@/types/schema'
import { attendanceSessionPath } from './attendanceSessionRoute'
import { getCurrentPeriod } from './period'

export function activityLogHref(
  metadata?: ActivityLogMetadata,
): string | undefined {
  if (!metadata) return undefined
  if (metadata.eventId) {
    return `/scores/event/${encodeURIComponent(metadata.eventId)}`
  }
  if (metadata.date) {
    return attendanceSessionPath(
      metadata.date,
      metadata.period ?? getCurrentPeriod(),
    )
  }
  if (metadata.classId) {
    return '/classes'
  }
  if (metadata.schoolYearId) {
    return '/subjects'
  }
  return undefined
}

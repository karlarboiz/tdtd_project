import type { ActivityLogMetadata } from '@/types/schema'
import { attendanceSessionPath } from './attendanceSessionRoute'
import { getCurrentPeriod } from './period'
import { studentLabPath } from './studentLabRoute'

/**
 * Deep link for a Recents row.
 * Score event and attendance date are more specific than studentId.
 * studentId wins over classId and schoolYearId.
 */
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
  if (metadata.studentId) {
    return studentLabPath(metadata.studentId)
  }
  if (metadata.classId) {
    return '/classes'
  }
  if (metadata.schoolYearId) {
    return '/subjects'
  }
  return undefined
}

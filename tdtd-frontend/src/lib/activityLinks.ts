import type { ActivityLogMetadata } from '@/types/schema'

export function activityLogHref(
  metadata?: ActivityLogMetadata,
): string | undefined {
  if (!metadata) return undefined
  if (metadata.eventId) {
    return `/scores/event/${encodeURIComponent(metadata.eventId)}`
  }
  if (metadata.date) {
    return `/attendance/session/${encodeURIComponent(metadata.date)}`
  }
  if (metadata.classId) {
    return '/classes'
  }
  if (metadata.schoolYearId) {
    return '/subjects'
  }
  return undefined
}

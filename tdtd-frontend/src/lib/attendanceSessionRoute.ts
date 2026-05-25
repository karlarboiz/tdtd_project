import type { AttendancePeriod } from '@/types/schema'

/** Path + query for an attendance session (period is required for stable deep links). */
export function attendanceSessionPath(
  dateYmd: string,
  period: AttendancePeriod,
): string {
  const q = new URLSearchParams({ period })
  return `/attendance/session/${encodeURIComponent(dateYmd)}?${q.toString()}`
}

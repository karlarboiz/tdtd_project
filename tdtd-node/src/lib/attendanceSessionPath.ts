import type { AttendancePeriod, IsoDateString } from '../schema/types.js'

/** In-app path for an attendance session (period required for stable deep links). */
export function attendanceSessionPath(
  dateYmd: IsoDateString,
  period: AttendancePeriod,
): string {
  const q = new URLSearchParams({ period })
  return `/attendance/session/${encodeURIComponent(dateYmd)}?${q.toString()}`
}

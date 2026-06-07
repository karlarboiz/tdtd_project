import type { AttendancePeriod, ClassRow, ClassShift } from '@/types/schema'

/** Attendance AM lines up with MRNG classes; PM with AFTNN. */
export function classShiftMatchesPeriod(
  shift: ClassShift,
  period: AttendancePeriod,
): boolean {
  return (
    (period === 'AM' && shift === 'MRNG') ||
    (period === 'PM' && shift === 'AFTNN')
  )
}

/**
 * One row per grade name for the attendance Class select.
 * Prefers the class whose shift matches the session period; if none exists for
 * that name (e.g. only MRNG grades registered), falls back so PM still lists
 * the same grade labels as AM.
 */
export function listClassesForAttendancePeriod(
  classes: ClassRow[],
  period: AttendancePeriod,
): ClassRow[] {
  const byName = new Map<string, ClassRow>()
  for (const c of classes) {
    const existing = byName.get(c.name)
    if (!existing) {
      byName.set(c.name, c)
      continue
    }
    const cMatches = classShiftMatchesPeriod(c.shift, period)
    const existingMatches = classShiftMatchesPeriod(existing.shift, period)
    if (cMatches && !existingMatches) {
      byName.set(c.name, c)
    }
  }
  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name))
}

export function formatClassShiftLabel(shift: ClassShift): string {
  return shift === 'MRNG' ? 'Morning (MRNG)' : 'Afternoon (AFTNN)'
}

import type { AttendancePeriod, ClassShift } from '../types/schema'

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

export function formatClassShiftLabel(shift: ClassShift): string {
  return shift === 'MRNG' ? 'Morning (MRNG)' : 'Afternoon (AFTNN)'
}

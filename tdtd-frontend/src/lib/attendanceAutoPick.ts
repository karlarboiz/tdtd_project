import type { ClassRow, StudentRow } from '@/types/schema'

export type ResolveAttendanceClassIdInput = {
  classesForPeriod: ClassRow[]
  savedPresentStudents: StudentRow[]
  currentClassId: string
}

export function resolveAttendanceClassId({
  classesForPeriod,
  savedPresentStudents,
  currentClassId,
}: ResolveAttendanceClassIdInput): string | null {
  if (
    currentClassId &&
    classesForPeriod.some((c) => c.id === currentClassId)
  ) {
    return null
  }

  if (classesForPeriod.length === 1) {
    return classesForPeriod[0].id
  }

  if (savedPresentStudents.length === 0) {
    return null
  }

  const uniq = [...new Set(savedPresentStudents.map((s) => s.classId))]
  if (uniq.length !== 1) {
    return null
  }

  const onlyClassId = uniq[0]
  return classesForPeriod.some((c) => c.id === onlyClassId) ? onlyClassId : null
}

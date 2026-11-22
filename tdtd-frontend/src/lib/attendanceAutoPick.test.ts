import { describe, expect, it } from 'vitest'
import { listClassesForAttendancePeriod } from '@/lib/classShift'
import { resolveAttendanceClassId } from '@/lib/attendanceAutoPick'
import type { ClassRow, StudentRow } from '@/types/schema'

function cls(id: string, name: string, shift: ClassRow['shift']): ClassRow {
  return { id, name, shift, createdAt: 1, updatedAt: 1 }
}

function student(id: string, classId: string): StudentRow {
  return {
    id,
    classId,
    firstName: 'Test',
    lastName: 'Student',
    birthDate: '2015-01-01',
    gender: 'M',
    createdAt: 0,
  }
}

describe('resolveAttendanceClassId', () => {
  const grade5 = cls('c1', 'Grade 5', 'MRNG')
  const grade6 = cls('c2', 'Grade 6', 'MRNG')

  it('returns null when current class is already valid', () => {
    expect(
      resolveAttendanceClassId({
        classesForPeriod: [grade5, grade6],
        savedPresentStudents: [],
        currentClassId: 'c1',
      }),
    ).toBeNull()
  })

  it('auto-picks the only class for the period', () => {
    expect(
      resolveAttendanceClassId({
        classesForPeriod: [grade5],
        savedPresentStudents: [],
        currentClassId: '',
      }),
    ).toBe('c1')
  })

  it('infers class from saved present roster when multiple classes exist', () => {
    expect(
      resolveAttendanceClassId({
        classesForPeriod: [grade5, grade6],
        savedPresentStudents: [student('s1', 'c2'), student('s2', 'c2')],
        currentClassId: '',
      }),
    ).toBe('c2')
  })

  it('returns null when saved roster spans multiple classes', () => {
    expect(
      resolveAttendanceClassId({
        classesForPeriod: [grade5, grade6],
        savedPresentStudents: [student('s1', 'c1'), student('s2', 'c2')],
        currentClassId: '',
      }),
    ).toBeNull()
  })

  it('returns null when inferred class is not in the period list', () => {
    expect(
      resolveAttendanceClassId({
        classesForPeriod: [grade5, grade6],
        savedPresentStudents: [student('s1', 'other-id')],
        currentClassId: '',
      }),
    ).toBeNull()
  })

  it('auto-picks morning-only grade in PM via listClassesForAttendancePeriod', () => {
    const classes = [cls('c1', 'Grade 5', 'MRNG')]
    const forPm = listClassesForAttendancePeriod(classes, 'PM')

    expect(forPm).toHaveLength(1)
    expect(
      resolveAttendanceClassId({
        classesForPeriod: forPm,
        savedPresentStudents: [],
        currentClassId: '',
      }),
    ).toBe('c1')
  })
})

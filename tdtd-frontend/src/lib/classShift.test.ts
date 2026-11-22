import { describe, expect, it } from 'vitest'
import { listClassesForAttendancePeriod } from './classShift'
import type { ClassRow } from '@/types/schema'

function cls(
  id: string,
  name: string,
  shift: ClassRow['shift'],
): ClassRow {
  return {
    id,
    name,
    shift,
    createdAt: 1,
    updatedAt: 1,
  }
}

describe('listClassesForAttendancePeriod', () => {
  it('shows morning-only grades in PM when no afternoon classes exist', () => {
    const classes = [cls('1', 'Grade 5', 'MRNG'), cls('2', 'Grade 6', 'MRNG')]
    const pm = listClassesForAttendancePeriod(classes, 'PM')
    expect(pm.map((c) => c.name)).toEqual(['Grade 5', 'Grade 6'])
    expect(pm.every((c) => c.shift === 'MRNG')).toBe(true)
  })

  it('prefers AFTNN for PM when both shifts exist for the same name', () => {
    const classes = [
      cls('1', 'Grade 5', 'MRNG'),
      cls('2', 'Grade 5', 'AFTNN'),
    ]
    const pm = listClassesForAttendancePeriod(classes, 'PM')
    expect(pm).toHaveLength(1)
    expect(pm[0]?.id).toBe('2')
    expect(pm[0]?.shift).toBe('AFTNN')
  })

  it('prefers MRNG for AM when both shifts exist for the same name', () => {
    const classes = [
      cls('1', 'Grade 5', 'MRNG'),
      cls('2', 'Grade 5', 'AFTNN'),
    ]
    const am = listClassesForAttendancePeriod(classes, 'AM')
    expect(am).toHaveLength(1)
    expect(am[0]?.id).toBe('1')
    expect(am[0]?.shift).toBe('MRNG')
  })
})

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createAttendanceSaveRunner,
  type AttendanceSaveContext,
} from '@/lib/attendanceAutoSaveLogic'
import { createDebouncedCallback } from '@/lib/debounce'
import type { AttendancePeriod } from '@/types/schema'

const AUTO_SAVE_DELAY_MS = 500

const baseContext: AttendanceSaveContext = {
  dateYmd: '2026-07-10',
  period: 'AM' as AttendancePeriod,
  classId: 'class-1',
  students: [
    {
      id: 's1',
      classId: 'class-1',
      firstName: 'Ana',
      lastName: 'Dela',
      birthDate: '2015-01-01',
      gender: 'M',
      createdAt: 0,
    },
  ],
  marks: { s1: 'present' },
}

describe('useAttendanceAutoSave integration', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('debounces dirty saves like the attendance hook', async () => {
    const save = vi.fn().mockResolvedValue(undefined)
    const onStatusChange = vi.fn()
    const runner = createAttendanceSaveRunner({
      save,
      onStatusChange,
      onSaved: vi.fn(),
    })
    runner.syncBaseline({ s1: 'absent' })

    let context = baseContext
    const debounced = createDebouncedCallback(() => {
      if (!runner.isDirty(context.marks)) return
      void runner.performSave(context)
    }, AUTO_SAVE_DELAY_MS)

    context = { ...baseContext, marks: { s1: 'present' } }
    debounced.schedule()
    context = { ...baseContext, marks: { s1: 'present' } }
    debounced.schedule()

    vi.advanceTimersByTime(AUTO_SAVE_DELAY_MS)
    await Promise.resolve()

    expect(save).toHaveBeenCalledTimes(1)
    expect(save).toHaveBeenCalledWith(context)
  })
})

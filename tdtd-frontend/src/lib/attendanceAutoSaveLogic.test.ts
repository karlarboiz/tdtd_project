import { describe, expect, it, vi } from 'vitest'
import {
  buildAttendanceSavePayload,
  createAttendanceSaveRunner,
  isAttendanceMarksDirty,
  type AttendanceSaveContext,
} from '@/lib/attendanceAutoSaveLogic'
import type { AttendancePeriod, StudentRow } from '@/types/schema'

function testStudent(
  id: string,
  firstName: string,
  lastName: string,
): StudentRow {
  return {
    id,
    classId: 'class-1',
    firstName,
    lastName,
    birthDate: '2015-01-01',
    gender: 'M',
    createdAt: 0,
  }
}

const baseContext: AttendanceSaveContext = {
  dateYmd: '2026-07-10',
  period: 'AM' as AttendancePeriod,
  classId: 'class-1',
  students: [testStudent('s1', 'Ana', 'Dela'), testStudent('s2', 'Ben', 'Cruz')],
  marks: { s1: 'present', s2: 'absent' },
}

describe('isAttendanceMarksDirty', () => {
  it('returns false when maps match', () => {
    expect(
      isAttendanceMarksDirty(
        { s1: 'present', s2: 'absent' },
        { s1: 'present', s2: 'absent' },
      ),
    ).toBe(false)
  })

  it('returns true when a student status changes', () => {
    expect(
      isAttendanceMarksDirty(
        { s1: 'present', s2: 'late' },
        { s1: 'present', s2: 'absent' },
      ),
    ).toBe(true)
  })
})

describe('buildAttendanceSavePayload', () => {
  it('maps each student status for the save API', () => {
    expect(buildAttendanceSavePayload(baseContext)).toEqual({
      date: '2026-07-10',
      period: 'AM',
      classStudentIds: ['s1', 's2'],
      marks: [
        { studentId: 's1', status: 'present' },
        { studentId: 's2', status: 'absent' },
      ],
    })
  })
})

describe('createAttendanceSaveRunner', () => {
  it('skips save when present matches baseline', async () => {
    const save = vi.fn()
    const onStatusChange = vi.fn()
    const runner = createAttendanceSaveRunner({
      save,
      onStatusChange,
      onSaved: vi.fn(),
    })

    runner.syncBaseline(baseContext.marks)
    await runner.performSave(baseContext)

    expect(save).not.toHaveBeenCalled()
  })

  it('saves dirty state and updates baseline', async () => {
    const save = vi.fn().mockResolvedValue(undefined)
    const onStatusChange = vi.fn()
    const onSaved = vi.fn()
    const runner = createAttendanceSaveRunner({
      save,
      onStatusChange,
      onSaved,
    })

    runner.syncBaseline({ s1: 'absent', s2: 'absent' })
    await runner.performSave(baseContext)

    expect(save).toHaveBeenCalledWith(baseContext)
    expect(onStatusChange).toHaveBeenCalledWith('saving')
    expect(onStatusChange).toHaveBeenCalledWith('saved')
    expect(onSaved).toHaveBeenCalledTimes(1)
    expect(runner.isDirty(baseContext.marks)).toBe(false)
  })

  it('flush waits for in-flight save then persists queued context', async () => {
    const save = vi.fn().mockResolvedValue(undefined)
    const runner = createAttendanceSaveRunner({
      save,
      onStatusChange: vi.fn(),
      onSaved: vi.fn(),
    })

    runner.syncBaseline({ s1: 'absent', s2: 'absent' })
    const first = runner.performSave(baseContext)
    const queued: AttendanceSaveContext = {
      ...baseContext,
      marks: { s1: 'present', s2: 'present' },
    }
    const flushed = runner.flush(queued)

    await Promise.all([first, flushed])

    expect(save).toHaveBeenCalledTimes(2)
    expect(save).toHaveBeenLastCalledWith(queued)
  })

  it('coalesces another save after in-flight completion', async () => {
    const save = vi
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
    const runner = createAttendanceSaveRunner({
      save,
      onStatusChange: vi.fn(),
      onSaved: vi.fn(),
    })

    runner.syncBaseline({ s1: 'absent', s2: 'absent' })
    const firstCtx = baseContext
    const secondCtx: AttendanceSaveContext = {
      ...baseContext,
      marks: { s1: 'present', s2: 'present' },
    }

    const first = runner.performSave(firstCtx)
    runner.queueWhileSaving(secondCtx)
    await first

    expect(save).toHaveBeenCalledTimes(2)
    expect(save).toHaveBeenLastCalledWith(secondCtx)
  })
})

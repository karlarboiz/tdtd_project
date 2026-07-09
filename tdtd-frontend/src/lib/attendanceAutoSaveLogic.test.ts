import { describe, expect, it, vi } from 'vitest'
import {
  buildAttendanceSavePayload,
  createAttendanceSaveRunner,
  isPresentMapDirty,
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
  present: { s1: true, s2: false },
}

describe('isPresentMapDirty', () => {
  it('returns false when maps match', () => {
    expect(isPresentMapDirty({ s1: true, s2: false }, { s1: true, s2: false })).toBe(
      false,
    )
  })

  it('returns true when a student toggles', () => {
    expect(isPresentMapDirty({ s1: true, s2: true }, { s1: true, s2: false })).toBe(
      true,
    )
  })
})

describe('buildAttendanceSavePayload', () => {
  it('maps present students for the save API', () => {
    expect(buildAttendanceSavePayload(baseContext)).toEqual({
      date: '2026-07-10',
      period: 'AM',
      classStudentIds: ['s1', 's2'],
      presentStudentIds: ['s1'],
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

    runner.syncBaseline(baseContext.present)
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

    runner.syncBaseline({ s1: false, s2: false })
    await runner.performSave(baseContext)

    expect(save).toHaveBeenCalledWith(baseContext)
    expect(onStatusChange).toHaveBeenCalledWith('saving')
    expect(onStatusChange).toHaveBeenCalledWith('saved')
    expect(onSaved).toHaveBeenCalledTimes(1)
    expect(runner.isDirty(baseContext.present)).toBe(false)
  })

  it('flush waits for in-flight save then persists queued context', async () => {
    const save = vi.fn().mockResolvedValue(undefined)
    const runner = createAttendanceSaveRunner({
      save,
      onStatusChange: vi.fn(),
      onSaved: vi.fn(),
    })

    runner.syncBaseline({ s1: false, s2: false })
    const first = runner.performSave(baseContext)
    const queued: AttendanceSaveContext = {
      ...baseContext,
      present: { s1: true, s2: true },
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

    runner.syncBaseline({ s1: false, s2: false })
    const firstCtx = baseContext
    const secondCtx: AttendanceSaveContext = {
      ...baseContext,
      present: { s1: true, s2: true },
    }

    const first = runner.performSave(firstCtx)
    runner.queueWhileSaving(secondCtx)
    await first

    expect(save).toHaveBeenCalledTimes(2)
    expect(save).toHaveBeenLastCalledWith(secondCtx)
  })
})

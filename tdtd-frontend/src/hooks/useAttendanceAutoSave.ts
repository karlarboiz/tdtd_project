import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { saveAttendance } from '@/api/attendanceApi'
import {
  type AttendanceMarkMap,
  type AttendanceSaveContext,
  type AttendanceSaveStatus,
  buildAttendanceSavePayload,
  createAttendanceSaveRunner,
} from '@/lib/attendanceAutoSaveLogic'
import { createDebouncedCallback } from '@/lib/debounce'
import { cancelAttendanceReminder } from '@/lib/reminderSchedule'
import type { AttendancePeriod, StudentRow } from '@/types/schema'

const AUTO_SAVE_DELAY_MS = 500

export type UseAttendanceAutoSaveOptions = {
  dateYmd: string
  period: AttendancePeriod
  classId: string
  students: StudentRow[]
  marks: AttendanceMarkMap
  enabled: boolean
  onSaved: () => void | Promise<void>
}

export function useAttendanceAutoSave({
  dateYmd,
  period,
  classId,
  students,
  marks,
  enabled,
  onSaved,
}: UseAttendanceAutoSaveOptions) {
  const [saveStatus, setSaveStatus] = useState<AttendanceSaveStatus>('idle')
  const [hasEdited, setHasEdited] = useState(false)
  const onSavedRef = useRef(onSaved)
  onSavedRef.current = onSaved

  const contextRef = useRef<AttendanceSaveContext>({
    dateYmd,
    period,
    classId,
    students,
    marks,
  })
  contextRef.current = { dateYmd, period, classId, students, marks }

  const runnerRef = useRef(
    createAttendanceSaveRunner({
      save: async (ctx) => {
        await saveAttendance(buildAttendanceSavePayload(ctx))
        await cancelAttendanceReminder(ctx.period)
      },
      onStatusChange: setSaveStatus,
      onSaved: () => onSavedRef.current(),
    }),
  )

  const debouncedSave = useMemo(
    () =>
      createDebouncedCallback(() => {
        const ctx = contextRef.current
        if (!enabled) return
        const runner = runnerRef.current
        if (!runner.isDirty(ctx.marks)) return
        if (runner.isSaving()) {
          runner.queueWhileSaving(ctx)
          return
        }
        void runner.performSave(ctx)
      }, AUTO_SAVE_DELAY_MS),
    [enabled],
  )

  useEffect(() => {
    return () => {
      debouncedSave.cancel()
    }
  }, [debouncedSave])

  const syncBaseline = useCallback(
    (baseline: AttendanceMarkMap) => {
      debouncedSave.cancel()
      runnerRef.current.syncBaseline(baseline)
      setHasEdited(false)
    },
    [debouncedSave],
  )

  const notifyMarksChanged = useCallback((marksOverride?: AttendanceMarkMap) => {
    if (!enabled) return
    const ctx = marksOverride
      ? { ...contextRef.current, marks: marksOverride }
      : contextRef.current
    const runner = runnerRef.current
    if (!runner.isDirty(ctx.marks)) {
      debouncedSave.cancel()
      if (!runner.isSaving() && saveStatus !== 'error') {
        setSaveStatus(hasEdited ? 'saved' : 'idle')
      }
      return
    }
    setHasEdited(true)
    setSaveStatus('pending')
    if (runner.isSaving()) {
      runner.queueWhileSaving(ctx)
      return
    }
    debouncedSave.schedule()
  }, [debouncedSave, enabled, hasEdited, saveStatus])

  const flush = useCallback(async () => {
    debouncedSave.cancel()
    const ctx = contextRef.current
    if (!ctx.classId || ctx.students.length === 0) return
    if (!runnerRef.current.isDirty(ctx.marks)) return
    try {
      await runnerRef.current.flush(ctx)
    } catch {
      // Error status is set by runner; flush callers ignore rejection.
    }
  }, [debouncedSave])

  useEffect(() => {
    return () => {
      void flush()
    }
  }, [flush])

  const retry = useCallback(() => {
    const ctx = contextRef.current
    if (!enabled || !ctx.classId || ctx.students.length === 0) return
    setSaveStatus('saving')
    void runnerRef.current.performSave(ctx)
  }, [enabled])

  return {
    saveStatus,
    hasEdited,
    notifyMarksChanged,
    syncBaseline,
    flush,
    retry,
  }
}

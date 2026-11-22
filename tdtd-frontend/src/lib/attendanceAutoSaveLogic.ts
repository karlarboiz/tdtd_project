import type {
  AttendancePeriod,
  AttendanceRecordStatus,
  StudentRow,
} from '@/types/schema'

export type AttendanceSaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error'

export type AttendanceMarkMap = Record<string, AttendanceRecordStatus>

export type AttendanceSaveContext = {
  dateYmd: string
  period: AttendancePeriod
  classId: string
  students: StudentRow[]
  marks: AttendanceMarkMap
}

export function isAttendanceMarksDirty(
  marks: AttendanceMarkMap,
  baseline: AttendanceMarkMap,
): boolean {
  const keys = new Set([...Object.keys(marks), ...Object.keys(baseline)])
  for (const key of keys) {
    if ((marks[key] ?? 'absent') !== (baseline[key] ?? 'absent')) return true
  }
  return false
}

export function buildAttendanceSavePayload(ctx: AttendanceSaveContext) {
  const classStudentIds = ctx.students.map((s) => s.id)
  return {
    date: ctx.dateYmd,
    period: ctx.period,
    classStudentIds,
    marks: classStudentIds.map((studentId) => ({
      studentId,
      status: ctx.marks[studentId] ?? 'absent',
    })),
  }
}

type SaveRunnerOptions = {
  save: (ctx: AttendanceSaveContext) => Promise<void>
  onStatusChange: (status: AttendanceSaveStatus) => void
  onSaved: () => void | Promise<void>
}

export function createAttendanceSaveRunner({
  save,
  onStatusChange,
  onSaved,
}: SaveRunnerOptions) {
  let lastSavedMarks: AttendanceMarkMap = {}
  let saving = false
  let saveAgainAfter = false
  let pendingContext: AttendanceSaveContext | null = null
  let inFlight: Promise<void> | null = null

  function syncBaseline(marks: AttendanceMarkMap) {
    lastSavedMarks = { ...marks }
    onStatusChange('idle')
  }

  function isDirty(marks: AttendanceMarkMap) {
    return isAttendanceMarksDirty(marks, lastSavedMarks)
  }

  async function performSave(ctx: AttendanceSaveContext): Promise<void> {
    if (!ctx.classId || ctx.students.length === 0) return
    if (!isDirty(ctx.marks)) return

    const run = async () => {
      saving = true
      onStatusChange('saving')
      try {
        await save(ctx)
        lastSavedMarks = { ...ctx.marks }
        onStatusChange('saved')
        await onSaved()
      } catch {
        onStatusChange('error')
        throw new Error('attendance save failed')
      } finally {
        saving = false
      }
    }

    inFlight = run()
    try {
      await inFlight
    } finally {
      inFlight = null
      if (saveAgainAfter && pendingContext) {
        saveAgainAfter = false
        const next = pendingContext
        pendingContext = null
        if (isDirty(next.marks)) {
          await performSave(next)
        }
      } else {
        pendingContext = null
        saveAgainAfter = false
      }
    }
  }

  async function flush(ctx: AttendanceSaveContext): Promise<void> {
    pendingContext = ctx
    if (inFlight) {
      saveAgainAfter = true
      try {
        await inFlight
      } catch {
        if (isDirty(ctx.marks)) {
          await performSave(ctx)
        }
      }
      return
    }
    await performSave(ctx)
  }

  function queueWhileSaving(ctx: AttendanceSaveContext) {
    pendingContext = ctx
    saveAgainAfter = true
  }

  return {
    syncBaseline,
    isDirty,
    performSave,
    flush,
    queueWhileSaving,
    isSaving: () => saving,
  }
}

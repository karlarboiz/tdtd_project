import type { AttendancePeriod, StudentRow } from '@/types/schema'

export type AttendanceSaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error'

export type AttendanceSaveContext = {
  dateYmd: string
  period: AttendancePeriod
  classId: string
  students: StudentRow[]
  present: Record<string, boolean>
}

export function isPresentMapDirty(
  present: Record<string, boolean>,
  baseline: Record<string, boolean>,
): boolean {
  const keys = new Set([...Object.keys(present), ...Object.keys(baseline)])
  for (const key of keys) {
    if (Boolean(present[key]) !== Boolean(baseline[key])) return true
  }
  return false
}

export function buildAttendanceSavePayload(ctx: AttendanceSaveContext) {
  const classStudentIds = ctx.students.map((s) => s.id)
  const presentStudentIds = classStudentIds.filter((id) => ctx.present[id])
  return {
    date: ctx.dateYmd,
    period: ctx.period,
    classStudentIds,
    presentStudentIds,
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
  let lastSavedPresent: Record<string, boolean> = {}
  let saving = false
  let saveAgainAfter = false
  let pendingContext: AttendanceSaveContext | null = null
  let inFlight: Promise<void> | null = null

  function syncBaseline(present: Record<string, boolean>) {
    lastSavedPresent = { ...present }
    onStatusChange('idle')
  }

  function isDirty(present: Record<string, boolean>) {
    return isPresentMapDirty(present, lastSavedPresent)
  }

  async function performSave(ctx: AttendanceSaveContext): Promise<void> {
    if (!ctx.classId || ctx.students.length === 0) return
    if (!isDirty(ctx.present)) return

    const run = async () => {
      saving = true
      onStatusChange('saving')
      try {
        await save(ctx)
        lastSavedPresent = { ...ctx.present }
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
        if (isDirty(next.present)) {
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
        if (isDirty(ctx.present)) {
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

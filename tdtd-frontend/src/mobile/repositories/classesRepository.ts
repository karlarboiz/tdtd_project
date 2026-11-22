import * as classesApi from '@/api/classesApi'
import type { ClassRow, ClassShift } from '@/types/schema'
import { isOfflineCapable } from '@/mobile/appTarget'
import { enqueueOutbox } from '@/mobile/sync/outbox'
import { openMobileDb } from '@/mobile/db/connection'

export async function listClasses(): Promise<ClassRow[]> {
  await openMobileDb()
  // Local SQLite read will replace this when the plugin is wired.
  return classesApi.listClasses()
}

export async function createClass(input: {
  name: string
  shift: ClassShift
}): Promise<ClassRow> {
  await openMobileDb()
  if (isOfflineCapable()) {
    enqueueOutbox({
      tableName: 'classes',
      operation: 'insert',
      payload: input,
    })
  }
  return classesApi.createClass(input)
}

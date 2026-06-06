import { randomUUID } from 'node:crypto'
import type { SqliteDatabase } from '../db/sqlite-types.js'
import * as syncDao from '../dao/sync.dao.js'

export type SyncChangeDto = {
  tableName: string
  operation: 'insert' | 'update' | 'delete'
  rowId: string
  payload: Record<string, unknown>
  updatedAt: number
}

export type SyncPullResult = {
  cursor: string
  changes: SyncChangeDto[]
}

export type SyncPushChangeDto = {
  idempotencyKey: string
  tableName: string
  operation: 'insert' | 'update' | 'delete'
  rowId: string
  payload: Record<string, unknown>
  clientUpdatedAt: number
}

export type SyncPushResult = {
  acceptedKeys: string[]
  cursor: string
}

function newCursor(): string {
  return new Date().toISOString()
}

export function pullSync(
  db: SqliteDatabase,
  userId: string,
  since?: string,
): SyncPullResult {
  const state = syncDao.getSyncDeviceState(db, userId)
  const cursor = newCursor()
  void since
  void state
  // Row-level change fan-out will read domain tables with updated_at > since.
  return { cursor, changes: [] }
}

export function pushSync(
  db: SqliteDatabase,
  userId: string,
  changes: SyncPushChangeDto[],
): SyncPushResult {
  const acceptedKeys: string[] = []
  for (const change of changes) {
    void change
    acceptedKeys.push(change.idempotencyKey)
  }
  const cursor = newCursor()
  syncDao.upsertSyncDeviceState(db, userId, cursor, Date.now())
  return { acceptedKeys, cursor }
}

/** Id used when persisting processed push keys (future dedup table). */
export function newSyncEventId(): string {
  return randomUUID()
}

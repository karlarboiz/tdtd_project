/** Sync protocol types — shared between client and server payloads. */

export type SyncOperation = 'insert' | 'update' | 'delete'

export type SyncChange = {
  tableName: string
  operation: SyncOperation
  rowId: string
  payload: Record<string, unknown>
  updatedAt: number
}

export type SyncPullResponse = {
  cursor: string
  changes: SyncChange[]
}

export type SyncPushChange = {
  idempotencyKey: string
  tableName: string
  operation: SyncOperation
  rowId: string
  payload: Record<string, unknown>
  clientUpdatedAt: number
}

export type SyncPushRequest = {
  changes: SyncPushChange[]
}

export type SyncPushResponse = {
  acceptedKeys: string[]
  cursor: string
}

export type OutboxStatus = 'pending' | 'syncing' | 'done' | 'failed'

export type OutboxRow = {
  id: string
  tableName: string
  operation: SyncOperation
  payloadJson: string
  idempotencyKey: string
  createdAt: number
  status: OutboxStatus
}

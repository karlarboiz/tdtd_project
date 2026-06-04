import { apiJson } from '@/lib/http'
import { listOutboxPending, markOutboxStatus, clearCompletedOutbox } from '@/mobile/sync/outbox'
import type {
  SyncPullResponse,
  SyncPushRequest,
  SyncPushResponse,
} from '@/mobile/sync/types'
import { isOfflineCapable } from '@/mobile/appTarget'

let lastPullCursor = ''

export function getLastPullCursor(): string {
  return lastPullCursor
}

export async function pullSync(since?: string): Promise<SyncPullResponse> {
  if (!isOfflineCapable()) {
    return { cursor: '', changes: [] }
  }
  const params = since ? `?since=${encodeURIComponent(since)}` : ''
  const res = await apiJson<SyncPullResponse>(`/api/sync/pull${params}`)
  lastPullCursor = res.cursor
  return res
}

export async function pushSync(): Promise<SyncPushResponse> {
  if (!isOfflineCapable()) {
    return { acceptedKeys: [], cursor: lastPullCursor }
  }
  const pending = listOutboxPending()
  if (pending.length === 0) {
    return { acceptedKeys: [], cursor: lastPullCursor }
  }

  for (const row of pending) {
    markOutboxStatus(row.id, 'syncing')
  }

  const body: SyncPushRequest = {
    changes: pending.map((row) => ({
      idempotencyKey: row.idempotencyKey,
      tableName: row.tableName,
      operation: row.operation,
      rowId: (JSON.parse(row.payloadJson) as { id?: string }).id ?? row.id,
      payload: JSON.parse(row.payloadJson) as Record<string, unknown>,
      clientUpdatedAt: row.createdAt,
    })),
  }

  const res = await apiJson<SyncPushResponse>('/api/sync/push', {
    method: 'POST',
    body: JSON.stringify(body),
  })

  for (const row of pending) {
    if (res.acceptedKeys.includes(row.idempotencyKey)) {
      markOutboxStatus(row.id, 'done')
    } else {
      markOutboxStatus(row.id, 'failed')
    }
  }
  clearCompletedOutbox()
  lastPullCursor = res.cursor
  return res
}

/** Full sync: push outbox then pull server changes. */
export async function syncNow(): Promise<{ push: SyncPushResponse; pull: SyncPullResponse }> {
  const push = await pushSync()
  const pull = await pullSync(lastPullCursor || undefined)
  return { push, pull }
}

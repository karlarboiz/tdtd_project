import { randomUUID } from '@/mobile/sync/outboxId'
import type { OutboxRow, OutboxStatus, SyncOperation } from '@/mobile/sync/types'
import { isOfflineCapable } from '@/mobile/appTarget'

/** In-memory outbox until @capacitor-community/sqlite is wired. */
const pending: OutboxRow[] = []

export function listOutboxPending(): OutboxRow[] {
  if (!isOfflineCapable()) return []
  return pending.filter((r) => r.status === 'pending' || r.status === 'failed')
}

export function enqueueOutbox(input: {
  tableName: string
  operation: SyncOperation
  payload: Record<string, unknown>
  idempotencyKey?: string
}): OutboxRow {
  if (!isOfflineCapable()) {
    throw new Error('Outbox is only available in the mobile app build')
  }
  const row: OutboxRow = {
    id: randomUUID(),
    tableName: input.tableName,
    operation: input.operation,
    payloadJson: JSON.stringify(input.payload),
    idempotencyKey: input.idempotencyKey ?? randomUUID(),
    createdAt: Date.now(),
    status: 'pending',
  }
  pending.push(row)
  return row
}

export function markOutboxStatus(id: string, status: OutboxStatus): void {
  const row = pending.find((r) => r.id === id)
  if (row) row.status = status
}

export function clearCompletedOutbox(): void {
  for (let i = pending.length - 1; i >= 0; i--) {
    if (pending[i]?.status === 'done') pending.splice(i, 1)
  }
}

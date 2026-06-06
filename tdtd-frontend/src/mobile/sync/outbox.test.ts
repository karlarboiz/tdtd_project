import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('outbox', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns no pending rows on web build', async () => {
    vi.stubEnv('VITE_APP_TARGET', '')
    const { listOutboxPending, enqueueOutbox } = await import('./outbox')
    expect(listOutboxPending()).toEqual([])
    expect(() =>
      enqueueOutbox({
        tableName: 'classes',
        operation: 'insert',
        payload: { name: 'A' },
      }),
    ).toThrow(/mobile app build/i)
  })

  it('enqueues and lists pending rows on mobile build', async () => {
    vi.stubEnv('VITE_APP_TARGET', 'mobile')
    const { enqueueOutbox, listOutboxPending } = await import('./outbox')
    const row = enqueueOutbox({
      tableName: 'classes',
      operation: 'insert',
      payload: { name: 'Grade 1' },
      idempotencyKey: 'idem-1',
    })
    expect(row.status).toBe('pending')
    expect(row.idempotencyKey).toBe('idem-1')
    expect(listOutboxPending()).toHaveLength(1)
  })

  it('clears completed rows and keeps failed rows', async () => {
    vi.stubEnv('VITE_APP_TARGET', 'mobile')
    const {
      enqueueOutbox,
      markOutboxStatus,
      clearCompletedOutbox,
      listOutboxPending,
    } = await import('./outbox')
    const done = enqueueOutbox({
      tableName: 'classes',
      operation: 'insert',
      payload: { id: 'c1' },
    })
    const failed = enqueueOutbox({
      tableName: 'classes',
      operation: 'update',
      payload: { id: 'c2' },
    })
    markOutboxStatus(done.id, 'done')
    markOutboxStatus(failed.id, 'failed')
    clearCompletedOutbox()
    const pending = listOutboxPending()
    expect(pending).toHaveLength(1)
    expect(pending[0]?.id).toBe(failed.id)
  })
})

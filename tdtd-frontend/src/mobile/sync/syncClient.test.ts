import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const apiJson = vi.fn()

vi.mock('@/lib/http', () => ({
  apiJson: (...args: unknown[]) => apiJson(...args),
}))

describe('syncClient', () => {
  beforeEach(() => {
    vi.resetModules()
    apiJson.mockReset()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('pullSync is a no-op on web without calling the API', async () => {
    vi.stubEnv('VITE_APP_TARGET', '')
    const { pullSync } = await import('./syncClient')
    const result = await pullSync()
    expect(result).toEqual({ cursor: '', changes: [] })
    expect(apiJson).not.toHaveBeenCalled()
  })

  it('pullSync stores cursor from API on mobile', async () => {
    vi.stubEnv('VITE_APP_TARGET', 'mobile')
    apiJson.mockResolvedValueOnce({
      cursor: 'cursor-1',
      changes: [{ tableName: 'classes', operation: 'insert', rowId: '1', payload: {}, updatedAt: 1 }],
    })
    const { pullSync, getLastPullCursor } = await import('./syncClient')
    const result = await pullSync('old-cursor')
    expect(apiJson).toHaveBeenCalledWith('/api/sync/pull?since=old-cursor')
    expect(result.cursor).toBe('cursor-1')
    expect(getLastPullCursor()).toBe('cursor-1')
  })

  it('pushSync marks accepted outbox rows done and clears them', async () => {
    vi.stubEnv('VITE_APP_TARGET', 'mobile')
    const outbox = await import('./outbox')
    outbox.enqueueOutbox({
      tableName: 'classes',
      operation: 'insert',
      payload: { id: 'class-1', name: 'Grade 1' },
      idempotencyKey: 'key-accepted',
    })
    outbox.enqueueOutbox({
      tableName: 'classes',
      operation: 'insert',
      payload: { id: 'class-2', name: 'Grade 2' },
      idempotencyKey: 'key-rejected',
    })

    apiJson.mockResolvedValueOnce({
      acceptedKeys: ['key-accepted'],
      cursor: 'cursor-2',
    })

    const { pushSync, getLastPullCursor } = await import('./syncClient')
    const result = await pushSync()
    expect(apiJson).toHaveBeenCalledWith('/api/sync/push', expect.objectContaining({ method: 'POST' }))
    expect(result.acceptedKeys).toEqual(['key-accepted'])
    expect(getLastPullCursor()).toBe('cursor-2')
    expect(outbox.listOutboxPending()).toHaveLength(1)
    expect(outbox.listOutboxPending()[0]?.idempotencyKey).toBe('key-rejected')
  })

  it('syncNow runs push then pull with stored cursor', async () => {
    vi.stubEnv('VITE_APP_TARGET', 'mobile')
    const outbox = await import('./outbox')
    outbox.enqueueOutbox({
      tableName: 'classes',
      operation: 'insert',
      payload: { id: 'class-1' },
      idempotencyKey: 'sync-now-key',
    })
    apiJson
      .mockResolvedValueOnce({ acceptedKeys: ['sync-now-key'], cursor: 'after-push' })
      .mockResolvedValueOnce({ cursor: 'after-pull', changes: [] })

    const { syncNow } = await import('./syncClient')
    const result = await syncNow()
    expect(apiJson).toHaveBeenNthCalledWith(1, '/api/sync/push', expect.any(Object))
    expect(apiJson).toHaveBeenNthCalledWith(2, '/api/sync/pull?since=after-push')
    expect(result.push.cursor).toBe('after-push')
    expect(result.pull.cursor).toBe('after-pull')
  })
})

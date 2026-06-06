import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import type { SqliteDatabase } from '../db/sqlite-types.js'
import { migrate } from '../db/migrate.js'
import { pullSync, pushSync } from './sync.service.js'
import * as userDao from '../dao/user.dao.js'
import * as syncDao from '../dao/sync.dao.js'

describe('sync.service', () => {
  let db: SqliteDatabase

  beforeEach(() => {
    db = new Database(':memory:') as SqliteDatabase
    db.pragma('foreign_keys = ON')
    migrate(db)
    userDao.insertUser(db, {
      id: 'user-1',
      firstName: 'Test',
      lastName: 'Teacher',
      email: 't@example.com',
      emailNormalized: 't@example.com',
      passwordHash: 'hash',
      role: 'teacher',
      createdAt: Date.now(),
    })
  })

  afterEach(() => {
    db.close()
  })

  it('pull returns cursor and empty changes', () => {
    const result = pullSync(db, 'user-1')
    expect(result.cursor).toBeTruthy()
    expect(result.changes).toEqual([])
  })

  it('push accepts idempotency keys and updates device state', () => {
    const result = pushSync(db, 'user-1', [
      {
        idempotencyKey: 'key-1',
        tableName: 'classes',
        operation: 'insert',
        rowId: 'class-1',
        payload: { name: 'Grade 1', shift: 'MRNG' },
        clientUpdatedAt: Date.now(),
      },
    ])
    expect(result.acceptedKeys).toEqual(['key-1'])
    expect(result.cursor).toBeTruthy()
    const state = syncDao.getSyncDeviceState(db, 'user-1')
    expect(state?.lastPullCursor).toBe(result.cursor)
    expect(state?.updatedAt).toBeTypeOf('number')
  })

  it('push is idempotent for duplicate idempotency keys in one batch', () => {
    const change = {
      idempotencyKey: 'dup-key',
      tableName: 'classes',
      operation: 'insert' as const,
      rowId: 'class-1',
      payload: { name: 'Grade 1' },
      clientUpdatedAt: Date.now(),
    }
    const result = pushSync(db, 'user-1', [change, change])
    expect(result.acceptedKeys).toEqual(['dup-key', 'dup-key'])
  })
})

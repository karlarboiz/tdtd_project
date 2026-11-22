import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import Database from 'better-sqlite3'
import type { SqliteDatabase } from '../db/sqlite-types.js'
import { migrate } from '../db/migrate.js'
import * as syncDao from './sync.dao.js'
import * as userDao from './user.dao.js'

describe('sync.dao', () => {
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

  it('getSyncDeviceState returns undefined when missing', () => {
    expect(syncDao.getSyncDeviceState(db, 'user-1')).toBeUndefined()
  })

  it('upsertSyncDeviceState inserts and updates cursor', () => {
    syncDao.upsertSyncDeviceState(db, 'user-1', 'cursor-a', 100)
    expect(syncDao.getSyncDeviceState(db, 'user-1')).toEqual({
      userId: 'user-1',
      lastPullCursor: 'cursor-a',
      updatedAt: 100,
    })

    syncDao.upsertSyncDeviceState(db, 'user-1', 'cursor-b', 200)
    expect(syncDao.getSyncDeviceState(db, 'user-1')?.lastPullCursor).toBe('cursor-b')
    expect(syncDao.getSyncDeviceState(db, 'user-1')?.updatedAt).toBe(200)
  })
})

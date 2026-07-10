import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import Sqlite from 'better-sqlite3'
import { migrate } from '../db/migrate.js'
import type { SqliteDatabase } from '../db/sqlite-types.js'
import { signup } from './auth.service.js'
import { createClass, listClasses } from './class.service.js'
import * as attendanceDao from '../dao/attendance.dao.js'
import { HttpError } from '../errors/http-error.js'

let db: SqliteDatabase
let dbPath: string

beforeEach(() => {
  dbPath = path.join(
    fs.mkdtempSync(path.join(os.tmpdir(), 'tdtd-isolation-')),
    'test.sqlite',
  )
  db = new Sqlite(dbPath) as SqliteDatabase
  db.pragma('foreign_keys = ON')
  migrate(db)
})

afterEach(() => {
  db.close()
  fs.rmSync(path.dirname(dbPath), { recursive: true, force: true })
})

describe('per-teacher data isolation (GAP-001)', () => {
  it('user B cannot list user A classes', async () => {
    const userA = await signup(db, {
      firstName: 'Alice',
      lastName: 'One',
      email: 'alice@example.com',
      password: 'password123',
    })
    const userB = await signup(db, {
      firstName: 'Bob',
      lastName: 'Two',
      email: 'bob@example.com',
      password: 'password123',
    })

    createClass(db, userA.user.id, { name: 'Grade 5-A', shift: 'MRNG' })

    expect(listClasses(db, userA.user.id)).toHaveLength(1)
    expect(listClasses(db, userB.user.id)).toHaveLength(0)
  })

  it('two users can both take AM attendance on the same date', async () => {
    const userA = await signup(db, {
      firstName: 'Alice',
      lastName: 'One',
      email: 'alice2@example.com',
      password: 'password123',
    })
    const userB = await signup(db, {
      firstName: 'Bob',
      lastName: 'Two',
      email: 'bob2@example.com',
      password: 'password123',
    })

    const date = '2026-05-28'
    attendanceDao.insertSession(db, {
      id: 'sess-a',
      userId: userA.user.id,
      date,
      period: 'AM',
      createdAt: Date.now(),
    })
    attendanceDao.insertSession(db, {
      id: 'sess-b',
      userId: userB.user.id,
      date,
      period: 'AM',
      createdAt: Date.now(),
    })

    const sessionA = attendanceDao.findSessionByDatePeriod(
      db,
      userA.user.id,
      date,
      'AM',
    )
    const sessionB = attendanceDao.findSessionByDatePeriod(
      db,
      userB.user.id,
      date,
      'AM',
    )

    expect(sessionA?.id).toBe('sess-a')
    expect(sessionB?.id).toBe('sess-b')
    expect(sessionA?.id).not.toBe(sessionB?.id)
  })

  it('getClassById returns undefined for cross-tenant access', async () => {
    const userA = await signup(db, {
      firstName: 'Alice',
      lastName: 'One',
      email: 'alice3@example.com',
      password: 'password123',
    })
    const userB = await signup(db, {
      firstName: 'Bob',
      lastName: 'Two',
      email: 'bob3@example.com',
      password: 'password123',
    })

    const created = createClass(db, userA.user.id, {
      name: 'Private Class',
      shift: 'AFTNN',
    })

    expect(() =>
      listClasses(db, userB.user.id).find((c) => c.id === created.id),
    ).not.toThrow()
    expect(listClasses(db, userB.user.id).find((c) => c.id === created.id)).toBeUndefined()
  })

  it('assertClassOwned throws 404 for another user class', async () => {
    const { assertClassOwned } = await import('../lib/ownership.js')
    const userA = await signup(db, {
      firstName: 'Alice',
      lastName: 'One',
      email: 'alice4@example.com',
      password: 'password123',
    })
    const userB = await signup(db, {
      firstName: 'Bob',
      lastName: 'Two',
      email: 'bob4@example.com',
      password: 'password123',
    })

    const created = createClass(db, userA.user.id, {
      name: 'Owned',
      shift: 'MRNG',
    })

    expect(() => assertClassOwned(db, created.id, userB.user.id)).toThrow(HttpError)
  })
})

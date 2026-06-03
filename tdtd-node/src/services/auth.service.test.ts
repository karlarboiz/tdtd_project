import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import Sqlite from 'better-sqlite3'
import { migrate } from '../db/migrate.js'
import type { SqliteDatabase } from '../db/sqlite-types.js'
import { hashRefreshToken } from '../lib/tokens.js'
import * as refreshTokenDao from '../dao/refreshToken.dao.js'
import {
  getMe,
  login,
  logout,
  refreshSession,
  signup,
} from './auth.service.js'

let db: SqliteDatabase
let dbPath: string

beforeEach(() => {
  dbPath = path.join(
    fs.mkdtempSync(path.join(os.tmpdir(), 'tdtd-auth-')),
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

describe('auth.service', () => {
  it('signup creates first user as admin and returns tokens', async () => {
    const res = await signup(db, {
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      password: 'password123',
    })
    expect(res.user.role).toBe('admin')
    expect(res.user.email).toBe('ada@example.com')
    expect(res.accessToken).toBeTruthy()
    expect(res.refreshToken).toBeTruthy()
    expect(getMe(db, res.user.id).firstName).toBe('Ada')
  })

  it('second signup is teacher', async () => {
    await signup(db, {
      firstName: 'A',
      lastName: 'B',
      email: 'first@example.com',
      password: 'password123',
    })
    const second = await signup(db, {
      firstName: 'T',
      lastName: 'C',
      email: 'teacher@example.com',
      password: 'password123',
    })
    expect(second.user.role).toBe('teacher')
  })

  it('login rejects bad password with generic message', async () => {
    await signup(db, {
      firstName: 'A',
      lastName: 'B',
      email: 'user@example.com',
      password: 'password123',
    })
    await expect(
      login(db, { email: 'user@example.com', password: 'wrong' }),
    ).rejects.toMatchObject({ statusCode: 401, message: 'Invalid email or password' })
  })

  it('refresh rotates token and rejects reuse', async () => {
    const first = await signup(db, {
      firstName: 'R',
      lastName: 'F',
      email: 'refresh@example.com',
      password: 'password123',
    })
    const second = await refreshSession(db, {
      refreshToken: first.refreshToken,
    })
    expect(second.refreshToken).not.toBe(first.refreshToken)

    await expect(
      refreshSession(db, { refreshToken: first.refreshToken }),
    ).rejects.toMatchObject({ statusCode: 401 })
  })

  it('logout revokes refresh token', async () => {
    const session = await signup(db, {
      firstName: 'L',
      lastName: 'O',
      email: 'logout@example.com',
      password: 'password123',
    })
    logout(db, { refreshToken: session.refreshToken })
    const hash = hashRefreshToken(session.refreshToken)
    const row = refreshTokenDao.findRefreshTokenByHash(db, hash)
    expect(row?.revokedAt).toBeDefined()
  })
})

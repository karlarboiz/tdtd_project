import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import Sqlite from 'better-sqlite3'
import { migrate } from '../db/migrate.js'
import type { SqliteDatabase } from '../db/sqlite-types.js'
import * as passwordResetTokenDao from '../dao/passwordResetToken.dao.js'
import * as userDao from '../dao/user.dao.js'
import { hashRefreshToken } from '../lib/tokens.js'
import * as refreshTokenDao from '../dao/refreshToken.dao.js'
import {
  changePassword,
  forgotPassword,
  getMe,
  isPasswordExpired,
  login,
  logout,
  refreshSession,
  resetPassword,
  signup,
  toAuthUser,
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
    expect(res.user.passwordChangedAt).toBeGreaterThan(0)
    expect(res.user.mustChangePassword).toBe(false)
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

  it('flags mustChangePassword when password is older than max age', async () => {
    const res = await signup(db, {
      firstName: 'Old',
      lastName: 'Pass',
      email: 'old@example.com',
      password: 'password123',
    })
    const user = userDao.findUserById(db, res.user.id)!
    const staleChangedAt = Date.now() - 61 * 24 * 60 * 60 * 1000
    userDao.updatePassword(db, user.id, user.passwordHash, staleChangedAt)

    const refreshed = userDao.findUserById(db, user.id)!
    expect(isPasswordExpired(refreshed.passwordChangedAt)).toBe(true)
    expect(toAuthUser(refreshed).mustChangePassword).toBe(true)

    const session = await login(db, {
      email: 'old@example.com',
      password: 'password123',
    })
    expect(session.user.mustChangePassword).toBe(true)
  })

  it('changePassword updates timestamp and rejects wrong current password', async () => {
    const session = await signup(db, {
      firstName: 'C',
      lastName: 'P',
      email: 'change@example.com',
      password: 'password123',
    })

    await expect(
      changePassword(db, session.user.id, {
        currentPassword: 'wrong',
        newPassword: 'newpassword123',
      }),
    ).rejects.toMatchObject({ statusCode: 401 })

    const updated = await changePassword(db, session.user.id, {
      currentPassword: 'password123',
      newPassword: 'newpassword123',
    })
    expect(updated.user.mustChangePassword).toBe(false)
    expect(updated.user.passwordChangedAt).toBeGreaterThanOrEqual(
      session.user.passwordChangedAt,
    )

    const loginRes = await login(db, {
      email: 'change@example.com',
      password: 'newpassword123',
    })
    expect(loginRes.accessToken).toBeTruthy()
  })

  it('forgotPassword succeeds for unknown email without error', async () => {
    await expect(
      forgotPassword(db, { email: 'missing@example.com' }),
    ).resolves.toBeUndefined()
  })

  it('resetPassword updates password with valid token', async () => {
    await signup(db, {
      firstName: 'R',
      lastName: 'S',
      email: 'reset@example.com',
      password: 'password123',
    })

    await forgotPassword(db, { email: 'reset@example.com' })

    const user = userDao.findUserByEmailNormalized(db, 'reset@example.com')!
    const rows = db
      .prepare(
        `SELECT token_hash FROM password_reset_tokens WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`,
      )
      .all(user.id) as { token_hash: string }[]

    expect(rows.length).toBe(1)

    const rawToken = 'test-reset-token-for-unit-test-only'
    passwordResetTokenDao.insertPasswordResetToken(db, {
      id: randomUUID(),
      userId: user.id,
      tokenHash: hashRefreshToken(rawToken),
      expiresAt: Date.now() + 60 * 60 * 1000,
      createdAt: Date.now(),
    })

    const session = await resetPassword(db, {
      token: rawToken,
      password: 'brandnewpass123',
    })
    expect(session.user.mustChangePassword).toBe(false)

    const loginRes = await login(db, {
      email: 'reset@example.com',
      password: 'brandnewpass123',
    })
    expect(loginRes.accessToken).toBeTruthy()
  })

  it('resetPassword rejects expired token', async () => {
    await signup(db, {
      firstName: 'X',
      lastName: 'Y',
      email: 'expired@example.com',
      password: 'password123',
    })
    const user = userDao.findUserByEmailNormalized(db, 'expired@example.com')!
    const rawToken = 'expired-reset-token'
    passwordResetTokenDao.insertPasswordResetToken(db, {
      id: randomUUID(),
      userId: user.id,
      tokenHash: hashRefreshToken(rawToken),
      expiresAt: Date.now() - 1000,
      createdAt: Date.now() - 2000,
    })

    await expect(
      resetPassword(db, { token: rawToken, password: 'newpassword123' }),
    ).rejects.toMatchObject({ statusCode: 400 })
  })
})

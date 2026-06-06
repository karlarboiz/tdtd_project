import { randomUUID } from 'node:crypto'
import type { SqliteDatabase } from '../db/sqlite-types.js'
import * as refreshTokenDao from '../dao/refreshToken.dao.js'
import * as userDao from '../dao/user.dao.js'
import { HttpError } from '../errors/http-error.js'
import { isValidEmailFormat, normalizeEmail } from '../lib/email.js'
import {
  assertPasswordPolicy,
  hashPassword,
  verifyPassword,
} from '../lib/password.js'
import { getRefreshTokenTtlMs } from '../lib/auth-config.js'
import {
  generateOpaqueRefreshToken,
  hashRefreshToken,
  signAccessToken,
} from '../lib/tokens.js'
import type {
  AuthTokensResponse,
  AuthUser,
  UserRole,
  UserRow,
} from '../schema/types.js'

const GENERIC_AUTH_ERROR = 'Invalid email or password'

export function toAuthUser(row: UserRow): AuthUser {
  return {
    id: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    role: row.role,
    isActive: row.isActive,
  }
}

function assertActiveUser(row: UserRow): void {
  if (!row.isActive) {
    throw new HttpError(403, 'Account is inactive')
  }
}

function trimName(value: unknown, field: string): string {
  if (typeof value !== 'string') {
    throw new HttpError(400, `${field} is required`)
  }
  const t = value.trim()
  if (!t) throw new HttpError(400, `${field} is required`)
  if (t.length > 120) throw new HttpError(400, `${field} is too long`)
  return t
}

async function issueTokenPair(
  db: SqliteDatabase,
  user: UserRow,
): Promise<AuthTokensResponse> {
  const now = Date.now()
  const accessToken = await signAccessToken(user.id, user.role)
  const refreshToken = generateOpaqueRefreshToken()
  const refreshId = randomUUID()

  refreshTokenDao.insertRefreshToken(db, {
    id: refreshId,
    userId: user.id,
    tokenHash: hashRefreshToken(refreshToken),
    expiresAt: now + getRefreshTokenTtlMs(),
    createdAt: now,
  })

  return {
    accessToken,
    refreshToken,
    user: toAuthUser(user),
  }
}

export async function signup(
  db: SqliteDatabase,
  body: {
    firstName?: unknown
    lastName?: unknown
    email?: unknown
    password?: unknown
  },
): Promise<AuthTokensResponse> {
  const firstName = trimName(body.firstName, 'firstName')
  const lastName = trimName(body.lastName, 'lastName')
  const emailRaw = typeof body.email === 'string' ? body.email : ''
  const password = typeof body.password === 'string' ? body.password : ''

  if (!isValidEmailFormat(emailRaw)) {
    throw new HttpError(400, 'Invalid email address')
  }
  try {
    assertPasswordPolicy(password)
  } catch {
    throw new HttpError(400, 'password must be at least 8 characters')
  }

  const emailNormalized = normalizeEmail(emailRaw)
  if (userDao.findUserByEmailNormalized(db, emailNormalized)) {
    throw new HttpError(409, 'An account with this email already exists')
  }

  const role: UserRole = userDao.countUsers(db) === 0 ? 'admin' : 'teacher'
  const now = Date.now()
  const user = userDao.insertUser(db, {
    id: randomUUID(),
    firstName,
    lastName,
    email: emailRaw.trim(),
    emailNormalized,
    passwordHash: await hashPassword(password),
    role,
    createdAt: now,
  })

  return issueTokenPair(db, user)
}

export async function login(
  db: SqliteDatabase,
  body: { email?: unknown; password?: unknown },
): Promise<AuthTokensResponse> {
  const emailRaw = typeof body.email === 'string' ? body.email : ''
  const password = typeof body.password === 'string' ? body.password : ''

  if (!emailRaw || !password) {
    throw new HttpError(401, GENERIC_AUTH_ERROR)
  }

  const user = userDao.findUserByEmailNormalized(db, normalizeEmail(emailRaw))
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    throw new HttpError(401, GENERIC_AUTH_ERROR)
  }

  assertActiveUser(user)
  return issueTokenPair(db, user)
}

export async function refreshSession(
  db: SqliteDatabase,
  body: { refreshToken?: unknown },
): Promise<AuthTokensResponse> {
  const raw =
    typeof body.refreshToken === 'string' ? body.refreshToken.trim() : ''
  if (!raw) {
    throw new HttpError(401, 'Invalid or expired refresh token')
  }

  const row = refreshTokenDao.findRefreshTokenByHash(db, hashRefreshToken(raw))
  const now = Date.now()

  if (!row || row.revokedAt != null || row.expiresAt <= now) {
    throw new HttpError(401, 'Invalid or expired refresh token')
  }

  const user = userDao.findUserById(db, row.userId)
  if (!user) {
    throw new HttpError(401, 'Invalid or expired refresh token')
  }
  assertActiveUser(user)

  const newRefresh = generateOpaqueRefreshToken()
  const newId = randomUUID()

  refreshTokenDao.revokeRefreshToken(db, row.id, now, newId)
  refreshTokenDao.insertRefreshToken(db, {
    id: newId,
    userId: user.id,
    tokenHash: hashRefreshToken(newRefresh),
    expiresAt: now + getRefreshTokenTtlMs(),
    createdAt: now,
  })

  return {
    accessToken: await signAccessToken(user.id, user.role),
    refreshToken: newRefresh,
    user: toAuthUser(user),
  }
}

export function logout(
  db: SqliteDatabase,
  body: { refreshToken?: unknown },
): void {
  const raw =
    typeof body.refreshToken === 'string' ? body.refreshToken.trim() : ''
  if (!raw) return

  const row = refreshTokenDao.findRefreshTokenByHash(db, hashRefreshToken(raw))
  if (!row || row.revokedAt != null) return

  refreshTokenDao.revokeRefreshToken(db, row.id, Date.now())
}

export function getMe(db: SqliteDatabase, userId: string): AuthUser {
  const user = userDao.findUserById(db, userId)
  if (!user) {
    throw new HttpError(401, 'Unauthorized')
  }
  assertActiveUser(user)
  return toAuthUser(user)
}

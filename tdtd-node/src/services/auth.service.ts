import { randomUUID } from 'node:crypto'
import type { SqliteDatabase } from '../db/sqlite-types.js'
import * as passwordResetTokenDao from '../dao/passwordResetToken.dao.js'
import * as refreshTokenDao from '../dao/refreshToken.dao.js'
import * as userDao from '../dao/user.dao.js'
import { HttpError } from '../errors/http-error.js'
import {
  getPasswordMaxAgeMs,
  getPasswordResetTtlMs,
  getRefreshTokenTtlMs,
} from '../lib/auth-config.js'
import { isValidEmailFormat, normalizeEmail } from '../lib/email.js'
import { sendPasswordResetEmail } from '../lib/mail.js'
import {
  assertPasswordPolicy,
  hashPassword,
  verifyPassword,
} from '../lib/password.js'
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

export function getPasswordExpiresAt(changedAt: number): number {
  return changedAt + getPasswordMaxAgeMs()
}

export function isPasswordExpired(changedAt: number, now = Date.now()): boolean {
  return now >= getPasswordExpiresAt(changedAt)
}

export function toAuthUser(row: UserRow, now = Date.now()): AuthUser {
  const passwordExpiresAt = getPasswordExpiresAt(row.passwordChangedAt)
  return {
    id: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    role: row.role,
    isActive: row.isActive,
    passwordChangedAt: row.passwordChangedAt,
    mustChangePassword: isPasswordExpired(row.passwordChangedAt, now),
    passwordExpiresAt,
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
    user: toAuthUser(user, now),
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
    user: toAuthUser(user, now),
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

export async function changePassword(
  db: SqliteDatabase,
  userId: string,
  body: { currentPassword?: unknown; newPassword?: unknown },
): Promise<AuthTokensResponse> {
  const currentPassword =
    typeof body.currentPassword === 'string' ? body.currentPassword : ''
  const newPassword =
    typeof body.newPassword === 'string' ? body.newPassword : ''

  if (!currentPassword || !newPassword) {
    throw new HttpError(400, 'currentPassword and newPassword are required')
  }

  const user = userDao.findUserById(db, userId)
  if (!user) {
    throw new HttpError(401, 'Unauthorized')
  }
  assertActiveUser(user)

  if (!(await verifyPassword(currentPassword, user.passwordHash))) {
    throw new HttpError(401, 'Current password is incorrect')
  }

  if (currentPassword === newPassword) {
    throw new HttpError(400, 'New password must differ from current password')
  }

  try {
    assertPasswordPolicy(newPassword)
  } catch {
    throw new HttpError(400, 'password must be at least 8 characters')
  }

  const now = Date.now()
  userDao.updatePassword(db, userId, await hashPassword(newPassword), now)
  refreshTokenDao.revokeAllRefreshTokensForUser(db, userId, now)

  const updated = userDao.findUserById(db, userId)!
  return issueTokenPair(db, updated)
}

export async function forgotPassword(
  db: SqliteDatabase,
  body: { email?: unknown },
): Promise<void> {
  const emailRaw = typeof body.email === 'string' ? body.email.trim() : ''
  if (!emailRaw || !isValidEmailFormat(emailRaw)) {
    return
  }

  const user = userDao.findUserByEmailNormalized(db, normalizeEmail(emailRaw))
  if (!user || !user.isActive) {
    return
  }

  const now = Date.now()
  passwordResetTokenDao.invalidateUnusedPasswordResetTokensForUser(
    db,
    user.id,
    now,
  )

  const rawToken = generateOpaqueRefreshToken()
  passwordResetTokenDao.insertPasswordResetToken(db, {
    id: randomUUID(),
    userId: user.id,
    tokenHash: hashRefreshToken(rawToken),
    expiresAt: now + getPasswordResetTtlMs(),
    createdAt: now,
  })

  await sendPasswordResetEmail(user.email, rawToken)
}

export async function resetPassword(
  db: SqliteDatabase,
  body: { token?: unknown; password?: unknown },
): Promise<AuthTokensResponse> {
  const rawToken = typeof body.token === 'string' ? body.token.trim() : ''
  const password = typeof body.password === 'string' ? body.password : ''

  if (!rawToken || !password) {
    throw new HttpError(400, 'token and password are required')
  }

  try {
    assertPasswordPolicy(password)
  } catch {
    throw new HttpError(400, 'password must be at least 8 characters')
  }

  const row = passwordResetTokenDao.findPasswordResetTokenByHash(
    db,
    hashRefreshToken(rawToken),
  )
  const now = Date.now()

  if (!row || row.usedAt != null || row.expiresAt <= now) {
    throw new HttpError(400, 'Invalid or expired reset token')
  }

  const user = userDao.findUserById(db, row.userId)
  if (!user) {
    throw new HttpError(400, 'Invalid or expired reset token')
  }
  assertActiveUser(user)

  userDao.updatePassword(db, user.id, await hashPassword(password), now)
  passwordResetTokenDao.markPasswordResetTokenUsed(db, row.id, now)
  refreshTokenDao.revokeAllRefreshTokensForUser(db, user.id, now)

  const updated = userDao.findUserById(db, user.id)!
  return issueTokenPair(db, updated)
}

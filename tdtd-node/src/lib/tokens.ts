import { createHash, randomBytes } from 'node:crypto'
import { SignJWT, jwtVerify } from 'jose'
import {
  getAccessTokenSecret,
  getAccessTokenTtlSeconds,
  getRefreshTokenPepper,
} from './auth-config.js'
import type { UserRole } from '../schema/types.js'

export type AccessTokenClaims = {
  sub: string
  role: UserRole
  type: 'access'
}

export function generateOpaqueRefreshToken(): string {
  return randomBytes(32).toString('base64url')
}

export function hashRefreshToken(raw: string): string {
  return createHash('sha256')
    .update(`${getRefreshTokenPepper()}:${raw}`)
    .digest('hex')
}

export async function signAccessToken(
  userId: string,
  role: UserRole,
): Promise<string> {
  const secret = new TextEncoder().encode(getAccessTokenSecret())
  return new SignJWT({ role, type: 'access' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${getAccessTokenTtlSeconds()}s`)
    .sign(secret)
}

export async function verifyAccessToken(
  token: string,
): Promise<AccessTokenClaims> {
  const secret = new TextEncoder().encode(getAccessTokenSecret())
  const { payload } = await jwtVerify(token, secret)
  if (payload.type !== 'access' || typeof payload.sub !== 'string') {
    throw new Error('invalid access token')
  }
  const role = payload.role
  if (role !== 'admin' && role !== 'teacher') {
    throw new Error('invalid access token role')
  }
  return { sub: payload.sub, role, type: 'access' }
}

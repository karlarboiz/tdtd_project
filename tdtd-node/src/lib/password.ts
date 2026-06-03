import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scryptAsync = promisify(scrypt)
const SALT_BYTES = 16
const KEY_LEN = 64

export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES)
  const derived = (await scryptAsync(plain, salt, KEY_LEN)) as Buffer
  return `scrypt:${salt.toString('base64')}:${derived.toString('base64')}`
}

export async function verifyPassword(
  plain: string,
  stored: string,
): Promise<boolean> {
  const parts = stored.split(':')
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false
  const salt = Buffer.from(parts[1]!, 'base64')
  const expected = Buffer.from(parts[2]!, 'base64')
  const derived = (await scryptAsync(plain, salt, expected.length)) as Buffer
  if (derived.length !== expected.length) return false
  return timingSafeEqual(derived, expected)
}

export function assertPasswordPolicy(password: string): void {
  if (password.length < 8) {
    throw new Error('password must be at least 8 characters')
  }
}

import type { SqliteDatabase } from '../db/sqlite-types.js'
import type { PasswordResetTokenRow } from '../schema/types.js'

type ResetDbRow = {
  id: string
  user_id: string
  token_hash: string
  expires_at: number
  used_at: number | null
  created_at: number
}

function mapRow(row: ResetDbRow): PasswordResetTokenRow {
  return {
    id: row.id,
    userId: row.user_id,
    tokenHash: row.token_hash,
    expiresAt: row.expires_at,
    usedAt: row.used_at ?? undefined,
    createdAt: row.created_at,
  }
}

export function insertPasswordResetToken(
  db: SqliteDatabase,
  input: {
    id: string
    userId: string
    tokenHash: string
    expiresAt: number
    createdAt: number
  },
): void {
  db.prepare(
    `INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(
    input.id,
    input.userId,
    input.tokenHash,
    input.expiresAt,
    input.createdAt,
  )
}

export function findPasswordResetTokenByHash(
  db: SqliteDatabase,
  tokenHash: string,
): PasswordResetTokenRow | undefined {
  const row = db
    .prepare(
      `SELECT id, user_id, token_hash, expires_at, used_at, created_at
       FROM password_reset_tokens WHERE token_hash = ?`,
    )
    .get(tokenHash) as ResetDbRow | undefined
  return row ? mapRow(row) : undefined
}

export function markPasswordResetTokenUsed(
  db: SqliteDatabase,
  id: string,
  usedAt: number,
): void {
  db.prepare(
    `UPDATE password_reset_tokens SET used_at = ? WHERE id = ?`,
  ).run(usedAt, id)
}

export function invalidateUnusedPasswordResetTokensForUser(
  db: SqliteDatabase,
  userId: string,
  usedAt: number,
): void {
  db.prepare(
    `UPDATE password_reset_tokens SET used_at = ?
     WHERE user_id = ? AND used_at IS NULL`,
  ).run(usedAt, userId)
}

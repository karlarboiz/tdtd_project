import type { SqliteDatabase } from '../db/sqlite-types.js'
import type { RefreshTokenRow } from '../schema/types.js'

type RefreshDbRow = {
  id: string
  user_id: string
  token_hash: string
  expires_at: number
  revoked_at: number | null
  created_at: number
  replaced_by_token_id: string | null
}

function mapRow(row: RefreshDbRow): RefreshTokenRow {
  return {
    id: row.id,
    userId: row.user_id,
    tokenHash: row.token_hash,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at ?? undefined,
    createdAt: row.created_at,
    replacedByTokenId: row.replaced_by_token_id ?? undefined,
  }
}

export function insertRefreshToken(
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
    `INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(
    input.id,
    input.userId,
    input.tokenHash,
    input.expiresAt,
    input.createdAt,
  )
}

export function findRefreshTokenByHash(
  db: SqliteDatabase,
  tokenHash: string,
): RefreshTokenRow | undefined {
  const row = db
    .prepare(
      `SELECT id, user_id, token_hash, expires_at, revoked_at, created_at, replaced_by_token_id
       FROM refresh_tokens WHERE token_hash = ?`,
    )
    .get(tokenHash) as RefreshDbRow | undefined
  return row ? mapRow(row) : undefined
}

export function revokeRefreshToken(
  db: SqliteDatabase,
  id: string,
  revokedAt: number,
  replacedByTokenId?: string,
): void {
  db.prepare(
    `UPDATE refresh_tokens
     SET revoked_at = ?, replaced_by_token_id = COALESCE(?, replaced_by_token_id)
     WHERE id = ?`,
  ).run(revokedAt, replacedByTokenId ?? null, id)
}

export function revokeAllRefreshTokensForUser(
  db: SqliteDatabase,
  userId: string,
  revokedAt: number,
): void {
  db.prepare(
    `UPDATE refresh_tokens SET revoked_at = ?
     WHERE user_id = ? AND revoked_at IS NULL`,
  ).run(revokedAt, userId)
}

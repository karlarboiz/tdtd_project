import type { SqliteDatabase } from '../db/sqlite-types.js'

export type SyncDeviceStateRow = {
  userId: string
  lastPullCursor: string
  updatedAt: number
}

export function getSyncDeviceState(
  db: SqliteDatabase,
  userId: string,
): SyncDeviceStateRow | undefined {
  const row = db
    .prepare(
      `
      SELECT user_id AS userId, last_pull_cursor AS lastPullCursor, updated_at AS updatedAt
      FROM sync_device_state
      WHERE user_id = ?
    `,
    )
    .get(userId) as SyncDeviceStateRow | undefined
  return row
}

export function upsertSyncDeviceState(
  db: SqliteDatabase,
  userId: string,
  lastPullCursor: string,
  updatedAt: number,
): void {
  db.prepare(
    `
    INSERT INTO sync_device_state (user_id, last_pull_cursor, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      last_pull_cursor = excluded.last_pull_cursor,
      updated_at = excluded.updated_at
  `,
  ).run(userId, lastPullCursor, updatedAt)
}

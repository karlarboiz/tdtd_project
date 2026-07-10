import type { SqliteDatabase } from '../db/sqlite-types.js'
import type { ActivityLogMetadata, ActivityLogRow } from '../schema/types.js'
import { ACTIVITY_LOG_QUERIES } from '../queries/activityLog.queries.js'

type ActivityLogDbRow = {
  id: string
  user_id: string
  action: string
  summary: string
  metadata: string | null
  created_at: number
}

function parseMetadata(raw: string | null): ActivityLogMetadata | undefined {
  if (!raw) return undefined
  try {
    return JSON.parse(raw) as ActivityLogMetadata
  } catch {
    return undefined
  }
}

export function mapActivityLogRow(row: ActivityLogDbRow): ActivityLogRow {
  return {
    id: row.id,
    userId: row.user_id,
    action: row.action,
    summary: row.summary,
    metadata: parseMetadata(row.metadata),
    createdAt: row.created_at,
  }
}

export function insertActivityLog(db: SqliteDatabase, row: ActivityLogRow): void {
  db.prepare(ACTIVITY_LOG_QUERIES.insert).run({
    id: row.id,
    user_id: row.userId,
    action: row.action,
    summary: row.summary,
    metadata: row.metadata ? JSON.stringify(row.metadata) : null,
    created_at: row.createdAt,
  })
}

export function listRecentActivityLogs(
  db: SqliteDatabase,
  userId: string,
  limit: number,
): ActivityLogRow[] {
  const rows = db
    .prepare(ACTIVITY_LOG_QUERIES.listRecent)
    .all(userId, limit) as ActivityLogDbRow[]
  return rows.map(mapActivityLogRow)
}

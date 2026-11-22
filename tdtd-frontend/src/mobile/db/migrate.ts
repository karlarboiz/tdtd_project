/**
 * Local SQLite DDL for mobile (device only).
 * Run via Capacitor SQLite plugin when Phase 4 storage is enabled.
 *
 * @see .cursor/schemas/sync.md
 */

export const MOBILE_SYNC_DDL = `
  CREATE TABLE IF NOT EXISTS sync_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sync_outbox (
    id TEXT PRIMARY KEY,
    table_name TEXT NOT NULL,
    operation TEXT NOT NULL CHECK (operation IN ('insert', 'update', 'delete')),
    payload_json TEXT NOT NULL,
    idempotency_key TEXT NOT NULL UNIQUE,
    created_at INTEGER NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'syncing', 'done', 'failed'))
  );
  CREATE INDEX IF NOT EXISTS idx_sync_outbox_status ON sync_outbox(status);
`

/** Domain tables mirror server migrate.ts — applied when local DB is opened. */
export function getMobileLocalDbMigrationSql(): string {
  return MOBILE_SYNC_DDL
}

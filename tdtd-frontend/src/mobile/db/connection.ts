import { isOfflineCapable } from '@/mobile/appTarget'
import { getMobileLocalDbMigrationSql } from '@/mobile/db/migrate'

let initialized = false

/**
 * Opens device SQLite when the Capacitor plugin is added.
 * Until then, repositories use HTTP (online) or the in-memory outbox.
 */
export async function openMobileDb(): Promise<void> {
  if (!isOfflineCapable()) return
  if (initialized) return
  // Future: @capacitor-community/sqlite — run getMobileLocalDbMigrationSql()
  void getMobileLocalDbMigrationSql()
  initialized = true
}

export function isMobileDbReady(): boolean {
  return isOfflineCapable() && initialized
}

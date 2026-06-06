import { describe, expect, it } from 'vitest'
import { MOBILE_SYNC_DDL, getMobileLocalDbMigrationSql } from './migrate'

describe('mobile db migrate', () => {
  it('includes sync outbox DDL', () => {
    expect(MOBILE_SYNC_DDL).toContain('sync_outbox')
    expect(MOBILE_SYNC_DDL).toContain('sync_meta')
  })

  it('getMobileLocalDbMigrationSql returns sync DDL', () => {
    expect(getMobileLocalDbMigrationSql()).toBe(MOBILE_SYNC_DDL)
  })
})

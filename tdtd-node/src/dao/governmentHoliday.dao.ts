import type { SqliteDatabase } from '../db/sqlite-types.js'
import type { GovernmentHolidayRow } from '../schema/types.js'
import { GOVERNMENT_HOLIDAY_QUERIES } from '../queries/governmentHoliday.queries.js'

type GovernmentHolidayDbRow = {
  date: string
  name: string
  type: GovernmentHolidayRow['type']
  year: number
  proclamation: string | null
  source_url: string | null
  fetched_at: number
}

function mapRow(row: GovernmentHolidayDbRow): GovernmentHolidayRow {
  return {
    date: row.date,
    name: row.name,
    type: row.type,
    year: row.year,
    proclamation: row.proclamation ?? undefined,
    sourceUrl: row.source_url ?? undefined,
    fetchedAt: row.fetched_at,
  }
}

export function mapGovernmentHolidayRow(
  row: GovernmentHolidayDbRow,
): GovernmentHolidayRow {
  return mapRow(row)
}

export function listGovernmentHolidaysByYear(
  db: SqliteDatabase,
  year: number,
): GovernmentHolidayRow[] {
  const rows = db
    .prepare(GOVERNMENT_HOLIDAY_QUERIES.listByYear)
    .all(year) as GovernmentHolidayDbRow[]
  return rows.map(mapRow)
}

export function listNonWorkingHolidaysInRange(
  db: SqliteDatabase,
  from: string,
  to: string,
): GovernmentHolidayRow[] {
  const rows = db
    .prepare(GOVERNMENT_HOLIDAY_QUERIES.listNonWorkingInRange)
    .all(from, to) as GovernmentHolidayDbRow[]
  return rows.map(mapRow)
}

export function getGovernmentHolidayByDate(
  db: SqliteDatabase,
  date: string,
): GovernmentHolidayRow | undefined {
  const row = db
    .prepare(GOVERNMENT_HOLIDAY_QUERIES.getByDate)
    .get(date) as GovernmentHolidayDbRow | undefined
  return row ? mapRow(row) : undefined
}

export function countGovernmentHolidaysByYear(
  db: SqliteDatabase,
  year: number,
): number {
  const row = db
    .prepare(GOVERNMENT_HOLIDAY_QUERIES.countByYear)
    .get(year) as { count: number }
  return row.count
}

export function maxFetchedAtForYear(
  db: SqliteDatabase,
  year: number,
): number | undefined {
  const row = db
    .prepare(GOVERNMENT_HOLIDAY_QUERIES.maxFetchedAtByYear)
    .get(year) as { fetched_at: number | null } | undefined
  return row?.fetched_at ?? undefined
}

export function isNonWorkingGovernmentHoliday(
  db: SqliteDatabase,
  date: string,
): boolean {
  const row = db
    .prepare(GOVERNMENT_HOLIDAY_QUERIES.isNonWorkingHoliday)
    .get(date) as { ok: 1 } | undefined
  return row !== undefined
}

export function replaceGovernmentHolidaysForYear(
  db: SqliteDatabase,
  year: number,
  rows: GovernmentHolidayRow[],
): void {
  const run = db.transaction(() => {
    db.prepare(GOVERNMENT_HOLIDAY_QUERIES.deleteByYear).run(year)
    const insert = db.prepare(GOVERNMENT_HOLIDAY_QUERIES.insert)
    for (const row of rows) {
      insert.run({
        date: row.date,
        name: row.name,
        type: row.type,
        year: row.year,
        proclamation: row.proclamation ?? null,
        source_url: row.sourceUrl ?? null,
        fetched_at: row.fetchedAt,
      })
    }
  })
  run()
}

export function insertGovernmentHolidaySeed(
  db: SqliteDatabase,
  row: GovernmentHolidayRow,
): void {
  db.prepare(GOVERNMENT_HOLIDAY_QUERIES.insert).run({
    date: row.date,
    name: row.name,
    type: row.type,
    year: row.year,
    proclamation: row.proclamation ?? null,
    source_url: row.sourceUrl ?? null,
    fetched_at: row.fetchedAt,
  })
}

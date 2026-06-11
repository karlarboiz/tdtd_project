import type { SqliteDatabase } from '../db/sqlite-types.js'
import type { GovernmentHolidayRow, IsoDateString } from '../schema/types.js'
import * as holidayDao from '../dao/governmentHoliday.dao.js'
import { HttpError } from '../errors/http-error.js'
import {
  GazetteScrapeError,
  scrapeOfficialGazetteYear,
} from '../lib/holidays/scrapeOfficialGazette.js'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const CACHE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000
const OFFICIAL_GAZETTE_SOURCE = 'Official Gazette of the Republic of the Philippines'

export type HolidaysForYearResult = {
  holidays: GovernmentHolidayRow[]
  meta: {
    year: number
    source: string
    fetchedAt?: number
    proclamation?: string
    sourceUrl?: string
  }
}

export type HolidaysRangeResult = {
  dates: IsoDateString[]
  holidays: Array<{ date: IsoDateString; name: string; type: GovernmentHolidayRow['type'] }>
}

function assertYear(yearRaw: unknown): number {
  const year = Number(yearRaw)
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new HttpError(400, 'year must be an integer between 2000 and 2100')
  }
  return year
}

function parseYmdOrThrow(raw: string, label: string): IsoDateString {
  const d = raw.trim()
  if (!DATE_RE.test(d)) {
    throw new HttpError(400, `${label} must be YYYY-MM-DD`)
  }
  return d
}

function yearsInRange(from: IsoDateString, to: IsoDateString): number[] {
  const startYear = Number(from.slice(0, 4))
  const endYear = Number(to.slice(0, 4))
  const years: number[] = []
  for (let y = startYear; y <= endYear; y++) years.push(y)
  return years
}

function isCacheStale(db: SqliteDatabase, year: number, now: number): boolean {
  const count = holidayDao.countGovernmentHolidaysByYear(db, year)
  if (count === 0) return true
  const fetchedAt = holidayDao.maxFetchedAtForYear(db, year)
  if (fetchedAt === undefined) return true
  return now - fetchedAt > CACHE_MAX_AGE_MS
}

export async function ensureYearCached(
  db: SqliteDatabase,
  year: number,
  now = Date.now(),
): Promise<void> {
  if (!isCacheStale(db, year, now)) return
  await refreshYear(db, year, now)
}

export async function refreshYear(
  db: SqliteDatabase,
  year: number,
  now = Date.now(),
): Promise<GovernmentHolidayRow[]> {
  try {
    const scraped = await scrapeOfficialGazetteYear(year)
    const rows = scraped.holidays.map((h) => ({ ...h, fetchedAt: now }))
    holidayDao.replaceGovernmentHolidaysForYear(db, year, rows)
    return rows
  } catch (e) {
    const cached = holidayDao.listGovernmentHolidaysByYear(db, year)
    if (cached.length > 0) return cached
    const msg = e instanceof GazetteScrapeError ? e.message : 'scrape failed'
    throw new HttpError(502, msg)
  }
}

export async function getHolidaysForYear(
  db: SqliteDatabase,
  yearRaw: unknown,
): Promise<HolidaysForYearResult> {
  const year = assertYear(yearRaw)
  await ensureYearCached(db, year)
  const holidays = holidayDao.listGovernmentHolidaysByYear(db, year)
  const first = holidays[0]
  return {
    holidays,
    meta: {
      year,
      source: OFFICIAL_GAZETTE_SOURCE,
      fetchedAt: holidayDao.maxFetchedAtForYear(db, year),
      proclamation: first?.proclamation,
      sourceUrl: first?.sourceUrl,
    },
  }
}

export async function getNonWorkingDatesInRange(
  db: SqliteDatabase,
  fromRaw: string,
  toRaw: string,
): Promise<HolidaysRangeResult> {
  const from = parseYmdOrThrow(fromRaw, 'from')
  const to = parseYmdOrThrow(toRaw, 'to')
  if (from > to) {
    throw new HttpError(400, 'from must be on or before to')
  }

  for (const year of yearsInRange(from, to)) {
    await ensureYearCached(db, year)
  }

  const holidays = holidayDao.listNonWorkingHolidaysInRange(db, from, to)
  return {
    dates: holidays.map((h) => h.date),
    holidays: holidays.map((h) => ({
      date: h.date,
      name: h.name,
      type: h.type,
    })),
  }
}

export function isNonWorkingHoliday(
  db: SqliteDatabase,
  date: IsoDateString,
): boolean {
  return holidayDao.isNonWorkingGovernmentHoliday(db, date)
}

export function getHolidayByDate(
  db: SqliteDatabase,
  dateRaw: string,
): GovernmentHolidayRow | undefined {
  const date = parseYmdOrThrow(dateRaw, 'date')
  return holidayDao.getGovernmentHolidayByDate(db, date)
}

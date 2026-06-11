import * as cheerio from 'cheerio'
import type { Element } from 'domhandler'
import type {
  GovernmentHolidayRow,
  GovernmentHolidayType,
  IsoDateString,
} from '../../schema/types.js'

const GAZETTE_BASE = 'https://www.officialgazette.gov.ph'
const FETCH_TIMEOUT_MS = 10_000
const USER_AGENT = 'TDTD/1.0 (+https://github.com/tdtd-project)'

const MONTHS: Record<string, number> = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
}

export type ScrapeResult = {
  holidays: GovernmentHolidayRow[]
  proclamation?: string
  sourceUrl?: string
  pageUrl: string
}

export class GazetteScrapeError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GazetteScrapeError'
  }
}

function gazetteUrlForYear(year: number): string {
  return `${GAZETTE_BASE}/nationwide-holidays/${year}/`
}

function headerToType(header: string): GovernmentHolidayType | null {
  const h = header.trim().toLowerCase()
  if (h.includes('regular holiday')) return 'REGULAR'
  if (h.includes('special') && h.includes('non-working')) {
    return 'SPECIAL_NON_WORKING'
  }
  if (h.includes('special') && h.includes('working')) {
    return 'SPECIAL_WORKING'
  }
  return null
}

/** Parse abbr title like "January 1, 2026" to YYYY-MM-DD. */
export function parseGazetteDateTitle(title: string): IsoDateString | null {
  const m = /^(\w+)\s+(\d{1,2}),\s+(\d{4})$/.exec(title.trim())
  if (!m) return null
  const month = MONTHS[m[1]!.toLowerCase()]
  if (!month) return null
  const day = Number(m[2])
  const year = Number(m[3])
  const dt = new Date(Date.UTC(year, month - 1, day))
  if (
    dt.getUTCFullYear() !== year ||
    dt.getUTCMonth() !== month - 1 ||
    dt.getUTCDate() !== day
  ) {
    return null
  }
  const mm = String(month).padStart(2, '0')
  const dd = String(day).padStart(2, '0')
  return `${year}-${mm}-${dd}`
}

export function parseOfficialGazetteHtml(
  html: string,
  year: number,
  pageUrl: string,
  fetchedAt = Date.now(),
): ScrapeResult {
  const $ = cheerio.load(html)
  const root = $('#nationwide_holidays')
  if (!root.length) {
    throw new GazetteScrapeError('missing #nationwide_holidays section')
  }

  const proclamation = root
    .find('.holiday-source .source-text')
    .first()
    .text()
    .trim()
  const sourceUrl =
    root.find('.holiday-source a').first().attr('href')?.trim() || undefined

  const holidays: GovernmentHolidayRow[] = []
  const seen = new Set<string>()

  root.find('.holidaypage').each((_i, section) => {
    const h4 = $(section).find('h4').first()
    const type = headerToType(h4.text())
    if (!type) return

    $(section)
      .find('tr.holiday-group')
      .each((_j, row) => {
        pushHolidayRow(
          $,
          row,
          type,
          year,
          fetchedAt,
          proclamation,
          sourceUrl,
          seen,
          holidays,
        )
      })
  })

  if (holidays.length === 0) {
    root.find('tr.holiday-group').each((_i, row) => {
      const name = $(row).find('.holiday-what').text().trim()
      const title = $(row).find('.holidate abbr').attr('title')?.trim()
      if (!name || !title) return
      const date = parseGazetteDateTitle(title)
      if (!date || seen.has(date)) return
      if (!date.startsWith(String(year))) return
      seen.add(date)
      holidays.push({
        date,
        name,
        type: 'REGULAR',
        year,
        proclamation: proclamation || undefined,
        sourceUrl,
        fetchedAt,
      })
    })
  }

  if (holidays.length === 0) {
    throw new GazetteScrapeError(`no holidays parsed for ${year}`)
  }

  holidays.sort((a, b) => a.date.localeCompare(b.date))
  return {
    holidays,
    proclamation: proclamation || undefined,
    sourceUrl,
    pageUrl,
  }
}

function pushHolidayRow(
  $: cheerio.CheerioAPI,
  row: Element,
  type: GovernmentHolidayType,
  year: number,
  fetchedAt: number,
  proclamation: string | undefined,
  sourceUrl: string | undefined,
  seen: Set<string>,
  holidays: GovernmentHolidayRow[],
): void {
  const name = $(row).find('.holiday-what').text().trim()
  const title = $(row).find('.holidate abbr').attr('title')?.trim()
  if (!name || !title) return
  const date = parseGazetteDateTitle(title)
  if (!date || seen.has(date)) return
  if (!date.startsWith(String(year))) return
  seen.add(date)
  holidays.push({
    date,
    name,
    type,
    year,
    proclamation,
    sourceUrl,
    fetchedAt,
  })
}

export async function fetchOfficialGazetteHtml(
  year: number,
  fetchImpl: typeof fetch = fetch,
): Promise<{ html: string; pageUrl: string }> {
  const pageUrl = gazetteUrlForYear(year)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetchImpl(pageUrl, {
      signal: controller.signal,
      headers: { 'User-Agent': USER_AGENT, Accept: 'text/html' },
    })
    if (!res.ok) {
      throw new GazetteScrapeError(
        `Official Gazette returned ${res.status} for ${pageUrl}`,
      )
    }
    const html = await res.text()
    if (!html.includes('nationwide_holidays')) {
      throw new GazetteScrapeError(`unexpected page content at ${pageUrl}`)
    }
    return { html, pageUrl }
  } catch (e) {
    if (e instanceof GazetteScrapeError) throw e
    const msg = e instanceof Error ? e.message : String(e)
    throw new GazetteScrapeError(`fetch failed for ${pageUrl}: ${msg}`)
  } finally {
    clearTimeout(timer)
  }
}

export async function scrapeOfficialGazetteYear(
  year: number,
  fetchImpl: typeof fetch = fetch,
): Promise<ScrapeResult> {
  const { html, pageUrl } = await fetchOfficialGazetteHtml(year, fetchImpl)
  return parseOfficialGazetteHtml(html, year, pageUrl)
}

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  parseGazetteDateTitle,
  parseOfficialGazetteHtml,
} from './scrapeOfficialGazette.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(
  __dirname,
  'fixtures',
  'gazette-nationwide-sample.html',
)

describe('parseGazetteDateTitle', () => {
  it('parses Official Gazette abbr titles', () => {
    expect(parseGazetteDateTitle('January 1, 2026')).toBe('2026-01-01')
    expect(parseGazetteDateTitle('August 31, 2026')).toBe('2026-08-31')
  })

  it('returns null for invalid titles', () => {
    expect(parseGazetteDateTitle('not a date')).toBeNull()
    expect(parseGazetteDateTitle('February 30, 2026')).toBeNull()
  })
})

describe('parseOfficialGazetteHtml', () => {
  it('parses 2026 nationwide holidays from fixture HTML', () => {
    const html = fs.readFileSync(fixturePath, 'utf8')
    const result = parseOfficialGazetteHtml(
      html,
      2026,
      'https://www.officialgazette.gov.ph/nationwide-holidays/2026/',
    )

    expect(result.proclamation).toBe('Proclamation No. 1006')
    expect(result.holidays.length).toBeGreaterThanOrEqual(18)

    const independence = result.holidays.find((h) => h.date === '2026-06-12')
    expect(independence).toMatchObject({
      name: 'Independence Day',
      type: 'REGULAR',
    })

    const chineseNewYear = result.holidays.find((h) => h.date === '2026-02-17')
    expect(chineseNewYear).toMatchObject({
      name: 'Chinese New Year',
      type: 'SPECIAL_NON_WORKING',
    })

    const edsa = result.holidays.find((h) => h.date === '2026-02-25')
    expect(edsa).toMatchObject({
      name: 'EDSA People Power Revolution Anniversary',
      type: 'SPECIAL_WORKING',
    })

    const nonWorkingDates = result.holidays
      .filter((h) => h.type !== 'SPECIAL_WORKING')
      .map((h) => h.date)
    expect(nonWorkingDates).toContain('2026-12-25')
    expect(nonWorkingDates).not.toContain('2026-02-25')
  })
})

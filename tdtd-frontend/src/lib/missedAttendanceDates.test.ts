import { describe, expect, it } from 'vitest'
import { uniqueDatesFromMissedDueItems } from './missedAttendanceDates'

describe('uniqueDatesFromMissedDueItems', () => {
  it('returns empty set for no items', () => {
    expect(uniqueDatesFromMissedDueItems([])).toEqual(new Set())
  })

  it('dedupes AM and PM items for the same date', () => {
    const dates = uniqueDatesFromMissedDueItems([
      { date: '2026-06-02' },
      { date: '2026-06-02' },
      { date: '2026-06-03' },
    ])
    expect([...dates].sort()).toEqual(['2026-06-02', '2026-06-03'])
  })
})

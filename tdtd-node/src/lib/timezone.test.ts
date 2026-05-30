import { describe, expect, it } from 'vitest'
import { isWeekendInTimezone } from './timezone.js'

describe('isWeekendInTimezone', () => {
  it('returns true on Saturday in Asia/Manila', () => {
    const sat = new Date('2026-05-30T12:00:00+08:00')
    expect(isWeekendInTimezone('Asia/Manila', sat)).toBe(true)
  })

  it('returns true on Sunday in Asia/Manila', () => {
    const sun = new Date('2026-05-31T12:00:00+08:00')
    expect(isWeekendInTimezone('Asia/Manila', sun)).toBe(true)
  })

  it('returns false on Friday in Asia/Manila', () => {
    const fri = new Date('2026-05-29T12:00:00+08:00')
    expect(isWeekendInTimezone('Asia/Manila', fri)).toBe(false)
  })
})

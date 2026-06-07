import { describe, expect, it } from 'vitest'
import { isWeekendDate, isWeekendYmd } from './dates'

describe('isWeekendYmd', () => {
  it('returns true for Saturday', () => {
    expect(isWeekendYmd('2026-06-06')).toBe(true)
  })

  it('returns true for Sunday', () => {
    expect(isWeekendYmd('2026-06-07')).toBe(true)
  })

  it('returns false for Monday', () => {
    expect(isWeekendYmd('2026-06-08')).toBe(false)
  })

  it('returns false for invalid YMD', () => {
    expect(isWeekendYmd('not-a-date')).toBe(false)
  })
})

describe('isWeekendDate', () => {
  it('returns true for Saturday', () => {
    expect(isWeekendDate(new Date(2026, 5, 6))).toBe(true)
  })

  it('returns false for Friday', () => {
    expect(isWeekendDate(new Date(2026, 5, 5))).toBe(false)
  })
})

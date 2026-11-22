import { describe, expect, it } from 'vitest'
import { descriptorForGrade, transmuteRawPercent } from './transmutation.js'

describe('transmuteRawPercent', () => {
  it('returns 100 for perfect score', () => {
    expect(transmuteRawPercent(100)).toBe(100)
  })

  it('maps 98.40 boundary to 99', () => {
    expect(transmuteRawPercent(98.4)).toBe(99)
    expect(transmuteRawPercent(99.99)).toBe(99)
  })

  it('maps 60.00–61.59 to 75', () => {
    expect(transmuteRawPercent(60)).toBe(75)
    expect(transmuteRawPercent(61.59)).toBe(75)
  })

  it('maps low scores to 60', () => {
    expect(transmuteRawPercent(0)).toBe(60)
    expect(transmuteRawPercent(3.99)).toBe(60)
  })

  it('maps mid-range initial grade', () => {
    expect(transmuteRawPercent(75)).toBe(84)
  })
})

describe('descriptorForGrade', () => {
  it('assigns Outstanding at 90+', () => {
    expect(descriptorForGrade(90)).toBe('Outstanding (O)')
  })

  it('assigns D below 75', () => {
    expect(descriptorForGrade(74)).toBe('Did Not Meet Expectations (D)')
  })
})

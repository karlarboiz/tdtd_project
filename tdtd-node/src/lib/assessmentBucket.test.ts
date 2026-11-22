import { describe, expect, it } from 'vitest'
import { isAssessmentBucket, resolveAssessmentBucket } from './assessmentBucket.js'

describe('resolveAssessmentBucket', () => {
  it('maps quiz subtypes to WW', () => {
    expect(resolveAssessmentBucket('QUIZ', 'RZ')).toBe('WW')
    expect(resolveAssessmentBucket('QUIZ', 'WZ')).toBe('WW')
    expect(resolveAssessmentBucket('QUIZ', 'QZ')).toBe('WW')
  })

  it('maps participation to WW', () => {
    expect(resolveAssessmentBucket('PARTICIPATION')).toBe('WW')
  })

  it('maps quarterly exam to QA', () => {
    expect(resolveAssessmentBucket('EXAM', 'QE')).toBe('QA')
  })

  it('defaults exam without subtype to WW', () => {
    expect(resolveAssessmentBucket('EXAM')).toBe('WW')
  })

  it('honors explicit override', () => {
    expect(resolveAssessmentBucket('EXAM', undefined, 'PT')).toBe('PT')
    expect(resolveAssessmentBucket('QUIZ', 'RZ', 'QA')).toBe('QA')
  })
})

describe('isAssessmentBucket', () => {
  it('accepts WW, PT, QA', () => {
    expect(isAssessmentBucket('WW')).toBe(true)
    expect(isAssessmentBucket('PT')).toBe(true)
    expect(isAssessmentBucket('QA')).toBe(true)
  })

  it('rejects invalid values', () => {
    expect(isAssessmentBucket('QUIZ')).toBe(false)
  })
})

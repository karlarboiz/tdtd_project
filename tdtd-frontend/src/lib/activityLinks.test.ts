import { describe, expect, it, vi } from 'vitest'
import { activityLogHref } from './activityLinks'

describe('activityLogHref', () => {
  it('returns score event route when eventId exists', () => {
    expect(activityLogHref({ eventId: 'event 123' })).toBe(
      '/scores/event/event%20123',
    )
  })

  it('returns attendance route when date exists with explicit period', () => {
    expect(activityLogHref({ date: '2026-05-27', period: 'PM' })).toBe(
      '/attendance/session/2026-05-27?period=PM',
    )
  })

  it('uses current period when attendance period is missing', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-27T08:00:00'))

    expect(activityLogHref({ date: '2026-05-27' })).toBe(
      '/attendance/session/2026-05-27?period=AM',
    )

    vi.useRealTimers()
  })

  it('returns section routes for class and school year metadata', () => {
    expect(activityLogHref({ classId: 'class-1' })).toBe('/classes')
    expect(activityLogHref({ schoolYearId: 'sy-1' })).toBe('/subjects')
  })

  it('returns undefined when metadata has no supported deep-link fields', () => {
    expect(activityLogHref({ studentId: 's-1' })).toBeUndefined()
    expect(activityLogHref()).toBeUndefined()
  })
})

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  INACTIVITY_LOGOUT_MS,
  INACTIVITY_WARNING_MS,
} from '@/lib/inactivityConfig'
import { createInactivityTimer } from '@/hooks/inactivityTimer'

describe('useInactivityTimeout timer engine', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('fires onWarning at 4 minutes and onLogout at 5 minutes', () => {
    const onWarning = vi.fn()
    const onLogout = vi.fn()
    const timer = createInactivityTimer({ onWarning, onLogout })

    timer.start()

    vi.advanceTimersByTime(INACTIVITY_WARNING_MS)
    expect(onWarning).toHaveBeenCalledTimes(1)
    expect(onLogout).not.toHaveBeenCalled()

    vi.advanceTimersByTime(INACTIVITY_LOGOUT_MS - INACTIVITY_WARNING_MS)
    expect(onLogout).toHaveBeenCalledTimes(1)
  })

  it('resets timers when activity occurs before warning', () => {
    const onWarning = vi.fn()
    const onLogout = vi.fn()
    const timer = createInactivityTimer({ onWarning, onLogout })

    timer.start()

    vi.advanceTimersByTime(INACTIVITY_WARNING_MS - 1000)
    timer.handleActivity()

    vi.advanceTimersByTime(INACTIVITY_WARNING_MS - 1000)
    expect(onWarning).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1000)
    expect(onWarning).toHaveBeenCalledTimes(1)
  })

  it('reset() postpones warning and logout callbacks', () => {
    const onWarning = vi.fn()
    const onLogout = vi.fn()
    const onDismissWarning = vi.fn()
    const timer = createInactivityTimer({
      onWarning,
      onLogout,
      onDismissWarning,
    })

    timer.start()
    vi.advanceTimersByTime(INACTIVITY_WARNING_MS)
    expect(onWarning).toHaveBeenCalledTimes(1)

    timer.reset()
    expect(onDismissWarning).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(INACTIVITY_WARNING_MS)
    expect(onWarning).toHaveBeenCalledTimes(2)
    expect(onLogout).not.toHaveBeenCalled()
  })

  it('pauses while hidden and resumes with remaining time', () => {
    const onWarning = vi.fn()
    const onLogout = vi.fn()
    const timer = createInactivityTimer({ onWarning, onLogout })

    timer.start()
    vi.advanceTimersByTime(60_000)
    timer.pause()

    vi.advanceTimersByTime(INACTIVITY_WARNING_MS)
    expect(onWarning).not.toHaveBeenCalled()

    timer.resume()
    vi.advanceTimersByTime(INACTIVITY_WARNING_MS - 60_000)
    expect(onWarning).toHaveBeenCalledTimes(1)
  })

  it('stop() clears pending callbacks', () => {
    const onWarning = vi.fn()
    const onLogout = vi.fn()
    const timer = createInactivityTimer({ onWarning, onLogout })

    timer.start()
    timer.stop()

    vi.advanceTimersByTime(INACTIVITY_LOGOUT_MS)
    expect(onWarning).not.toHaveBeenCalled()
    expect(onLogout).not.toHaveBeenCalled()
  })
})

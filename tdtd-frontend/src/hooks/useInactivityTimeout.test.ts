import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createInactivityTimer } from '@/hooks/inactivityTimer'

const WARNING_MS = 4 * 60 * 1000
const LOGOUT_MS = 5 * 60 * 1000

function createTestTimer(
  callbacks: Parameters<typeof createInactivityTimer>[0],
) {
  return createInactivityTimer(callbacks, {
    warningMs: WARNING_MS,
    logoutMs: LOGOUT_MS,
  })
}

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
    const timer = createTestTimer({ onWarning, onLogout })

    timer.start()

    vi.advanceTimersByTime(WARNING_MS)
    expect(onWarning).toHaveBeenCalledTimes(1)
    expect(onLogout).not.toHaveBeenCalled()

    vi.advanceTimersByTime(LOGOUT_MS - WARNING_MS)
    expect(onLogout).toHaveBeenCalledTimes(1)
  })

  it('resets timers when activity occurs before warning', () => {
    const onWarning = vi.fn()
    const onLogout = vi.fn()
    const timer = createTestTimer({ onWarning, onLogout })

    timer.start()

    vi.advanceTimersByTime(WARNING_MS - 1000)
    timer.handleActivity()

    vi.advanceTimersByTime(WARNING_MS - 1000)
    expect(onWarning).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1000)
    expect(onWarning).toHaveBeenCalledTimes(1)
  })

  it('reset() postpones warning and logout callbacks', () => {
    const onWarning = vi.fn()
    const onLogout = vi.fn()
    const onDismissWarning = vi.fn()
    const timer = createTestTimer({
      onWarning,
      onLogout,
      onDismissWarning,
    })

    timer.start()
    vi.advanceTimersByTime(WARNING_MS)
    expect(onWarning).toHaveBeenCalledTimes(1)

    timer.reset()
    expect(onDismissWarning).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(WARNING_MS)
    expect(onWarning).toHaveBeenCalledTimes(2)
    expect(onLogout).not.toHaveBeenCalled()
  })

  it('pauses while hidden and resumes with remaining time', () => {
    const onWarning = vi.fn()
    const onLogout = vi.fn()
    const timer = createTestTimer({ onWarning, onLogout })

    timer.start()
    vi.advanceTimersByTime(60_000)
    timer.pause()

    vi.advanceTimersByTime(WARNING_MS)
    expect(onWarning).not.toHaveBeenCalled()

    timer.resume()
    vi.advanceTimersByTime(WARNING_MS - 60_000)
    expect(onWarning).toHaveBeenCalledTimes(1)
  })

  it('stop() clears pending callbacks', () => {
    const onWarning = vi.fn()
    const onLogout = vi.fn()
    const timer = createTestTimer({ onWarning, onLogout })

    timer.start()
    timer.stop()

    vi.advanceTimersByTime(LOGOUT_MS)
    expect(onWarning).not.toHaveBeenCalled()
    expect(onLogout).not.toHaveBeenCalled()
  })
})

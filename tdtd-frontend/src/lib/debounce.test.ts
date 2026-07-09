import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createDebouncedCallback } from '@/lib/debounce'

describe('createDebouncedCallback', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('coalesces rapid schedule calls into one invocation', () => {
    const fn = vi.fn()
    const debounced = createDebouncedCallback(fn, 500)

    debounced.schedule('a')
    debounced.schedule('b')
    debounced.schedule('c')

    expect(fn).not.toHaveBeenCalled()

    vi.advanceTimersByTime(500)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith('c')
  })

  it('flush runs immediately with the latest args', () => {
    const fn = vi.fn()
    const debounced = createDebouncedCallback(fn, 500)

    debounced.schedule('first')
    debounced.schedule('second')
    debounced.flush()

    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith('second')

    vi.advanceTimersByTime(500)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('cancel clears pending invocation', () => {
    const fn = vi.fn()
    const debounced = createDebouncedCallback(fn, 500)

    debounced.schedule('pending')
    debounced.cancel()

    vi.advanceTimersByTime(500)
    expect(fn).not.toHaveBeenCalled()
  })

  it('flush is a no-op when nothing is scheduled', () => {
    const fn = vi.fn()
    const debounced = createDebouncedCallback(fn, 500)

    debounced.flush()
    expect(fn).not.toHaveBeenCalled()
  })
})

import { describe, expect, it, vi, afterEach } from 'vitest'
import { getAppTarget, isMobileApp, isOfflineCapable } from '@/mobile/appTarget'

describe('appTarget', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('defaults to web', () => {
    vi.stubEnv('VITE_APP_TARGET', '')
    expect(getAppTarget()).toBe('web')
    expect(isMobileApp()).toBe(false)
    expect(isOfflineCapable()).toBe(false)
  })

  it('detects mobile build flavor', () => {
    vi.stubEnv('VITE_APP_TARGET', 'mobile')
    expect(getAppTarget()).toBe('mobile')
    expect(isMobileApp()).toBe(true)
    expect(isOfflineCapable()).toBe(true)
  })
})

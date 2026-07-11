import { describe, expect, it, vi, afterEach } from 'vitest'
import { getAppTarget, isMobileApp, isNativePlatform, isOfflineCapable } from '@/mobile/appTarget'

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: vi.fn(() => false),
  },
}))

import { Capacitor } from '@capacitor/core'

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

  it('isNativePlatform delegates to Capacitor', () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true)
    expect(isNativePlatform()).toBe(true)
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false)
    expect(isNativePlatform()).toBe(false)
  })
})

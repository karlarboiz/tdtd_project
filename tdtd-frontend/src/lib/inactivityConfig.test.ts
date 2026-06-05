import { afterEach, describe, expect, it, vi } from 'vitest'

describe('inactivityConfig', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('uses production defaults when env overrides are unset', async () => {
    vi.stubEnv('DEV', 'true')
    const config = await import('./inactivityConfig')
    expect(config.INACTIVITY_WARNING_MS).toBe(4 * 60 * 1000)
    expect(config.INACTIVITY_LOGOUT_MS).toBe(5 * 60 * 1000)
    expect(config.INACTIVITY_COUNTDOWN_MS).toBe(60 * 1000)
  })

  it('applies dev env overrides for warning and logout', async () => {
    vi.stubEnv('DEV', 'true')
    vi.stubEnv('VITE_INACTIVITY_WARNING_MS', '10000')
    vi.stubEnv('VITE_INACTIVITY_LOGOUT_MS', '15000')
    const config = await import('./inactivityConfig')
    expect(config.INACTIVITY_WARNING_MS).toBe(10_000)
    expect(config.INACTIVITY_LOGOUT_MS).toBe(15_000)
    expect(config.INACTIVITY_COUNTDOWN_MS).toBe(5_000)
  })

  it('ignores env overrides in production builds', async () => {
    vi.stubEnv('DEV', '')
    vi.stubEnv('VITE_INACTIVITY_WARNING_MS', '1000')
    vi.stubEnv('VITE_INACTIVITY_LOGOUT_MS', '2000')
    const config = await import('./inactivityConfig')
    expect(config.INACTIVITY_WARNING_MS).toBe(4 * 60 * 1000)
    expect(config.INACTIVITY_LOGOUT_MS).toBe(5 * 60 * 1000)
  })
})

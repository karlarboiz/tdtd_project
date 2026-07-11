import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const sessionStore = new Map<string, string>()

const sessionStorageMock = {
  getItem: (key: string) => sessionStore.get(key) ?? null,
  setItem: (key: string, value: string) => {
    sessionStore.set(key, value)
  },
  removeItem: (key: string) => {
    sessionStore.delete(key)
  },
  clear: () => {
    sessionStore.clear()
  },
}

vi.stubGlobal('sessionStorage', sessionStorageMock)

const secureStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  remove: vi.fn(),
}

vi.mock('@aparajita/capacitor-secure-storage', () => ({
  SecureStorage: secureStorageMock,
}))

const isNativePlatformMock = vi.fn(() => false)

vi.mock('@/mobile/appTarget', () => ({
  isNativePlatform: () => isNativePlatformMock(),
}))

describe('authStorage', () => {
  beforeEach(() => {
    vi.resetModules()
    sessionStore.clear()
    secureStorageMock.getItem.mockReset()
    secureStorageMock.setItem.mockReset()
    secureStorageMock.remove.mockReset()
    isNativePlatformMock.mockReturnValue(false)
  })

  afterEach(() => {
    sessionStore.clear()
  })

  async function loadAuthStorage() {
    return import('@/lib/authStorage')
  }

  describe('web (sessionStorage)', () => {
    it('round-trips tokens via sessionStorage', async () => {
      const { setTokens, getAccessToken, getRefreshToken } =
        await loadAuthStorage()

      await setTokens('access-1', 'refresh-1')
      expect(getAccessToken()).toBe('access-1')
      expect(getRefreshToken()).toBe('refresh-1')
      expect(sessionStore.get('tdtd.accessToken')).toBe('access-1')
      expect(sessionStore.get('tdtd.refreshToken')).toBe('refresh-1')
    })

    it('clearTokens removes sessionStorage keys', async () => {
      const { setTokens, clearTokens, getAccessToken, getRefreshToken } =
        await loadAuthStorage()

      await setTokens('a', 'r')
      await clearTokens()
      expect(getAccessToken()).toBeNull()
      expect(getRefreshToken()).toBeNull()
    })

    it('hydrateTokens is a no-op on web', async () => {
      const { hydrateTokens } = await loadAuthStorage()
      await hydrateTokens()
      await hydrateTokens()
      expect(secureStorageMock.getItem).not.toHaveBeenCalled()
    })
  })

  describe('native (secure storage)', () => {
    beforeEach(() => {
      isNativePlatformMock.mockReturnValue(true)
    })

    it('hydrates from SecureStorage into memory cache', async () => {
      secureStorageMock.getItem.mockImplementation(async (key: string) => {
        if (key === 'tdtd.accessToken') return 'native-access'
        if (key === 'tdtd.refreshToken') return 'native-refresh'
        return null
      })

      const { hydrateTokens, getAccessToken, getRefreshToken } =
        await loadAuthStorage()

      expect(getAccessToken()).toBeNull()
      await hydrateTokens()
      expect(getAccessToken()).toBe('native-access')
      expect(getRefreshToken()).toBe('native-refresh')
      expect(secureStorageMock.getItem).toHaveBeenCalledTimes(2)
    })

    it('hydrateTokens is idempotent', async () => {
      secureStorageMock.getItem.mockResolvedValue(null)
      const { hydrateTokens } = await loadAuthStorage()

      await hydrateTokens()
      await hydrateTokens()
      expect(secureStorageMock.getItem).toHaveBeenCalledTimes(2)
    })

    it('setTokens updates cache and persists to SecureStorage', async () => {
      const { setTokens, getAccessToken, getRefreshToken } =
        await loadAuthStorage()

      await setTokens('new-access', 'new-refresh')
      expect(getAccessToken()).toBe('new-access')
      expect(getRefreshToken()).toBe('new-refresh')
      expect(secureStorageMock.setItem).toHaveBeenCalledWith(
        'tdtd.accessToken',
        'new-access',
      )
      expect(secureStorageMock.setItem).toHaveBeenCalledWith(
        'tdtd.refreshToken',
        'new-refresh',
      )
      expect(sessionStore.has('tdtd.accessToken')).toBe(false)
    })

    it('clearTokens removes secure storage keys and cache', async () => {
      const {
        setTokens,
        clearTokens,
        getAccessToken,
        getRefreshToken,
      } = await loadAuthStorage()

      await setTokens('a', 'r')
      await clearTokens()
      expect(getAccessToken()).toBeNull()
      expect(getRefreshToken()).toBeNull()
      expect(secureStorageMock.remove).toHaveBeenCalledWith('tdtd.accessToken')
      expect(secureStorageMock.remove).toHaveBeenCalledWith('tdtd.refreshToken')
    })
  })
})

import { SecureStorage } from '@aparajita/capacitor-secure-storage'
import { isNativePlatform } from '@/mobile/appTarget'

const ACCESS_KEY = 'tdtd.accessToken'
const REFRESH_KEY = 'tdtd.refreshToken'

let memoryAccess: string | null = null
let memoryRefresh: string | null = null
let hydrated = false

export async function hydrateTokens(): Promise<void> {
  if (hydrated) return
  if (isNativePlatform()) {
    memoryAccess = await SecureStorage.getItem(ACCESS_KEY)
    memoryRefresh = await SecureStorage.getItem(REFRESH_KEY)
  }
  hydrated = true
}

export function getAccessToken(): string | null {
  if (isNativePlatform()) {
    return memoryAccess
  }
  return sessionStorage.getItem(ACCESS_KEY)
}

export function getRefreshToken(): string | null {
  if (isNativePlatform()) {
    return memoryRefresh
  }
  return sessionStorage.getItem(REFRESH_KEY)
}

export async function setTokens(
  accessToken: string,
  refreshToken: string,
): Promise<void> {
  if (isNativePlatform()) {
    memoryAccess = accessToken
    memoryRefresh = refreshToken
    await SecureStorage.setItem(ACCESS_KEY, accessToken)
    await SecureStorage.setItem(REFRESH_KEY, refreshToken)
    return
  }
  sessionStorage.setItem(ACCESS_KEY, accessToken)
  sessionStorage.setItem(REFRESH_KEY, refreshToken)
}

export async function clearTokens(): Promise<void> {
  if (isNativePlatform()) {
    memoryAccess = null
    memoryRefresh = null
    await Promise.all([
      SecureStorage.remove(ACCESS_KEY),
      SecureStorage.remove(REFRESH_KEY),
    ])
    return
  }
  sessionStorage.removeItem(ACCESS_KEY)
  sessionStorage.removeItem(REFRESH_KEY)
}

/** @internal Test helper — resets in-memory hydration state. */
export function resetAuthStorageForTests(): void {
  memoryAccess = null
  memoryRefresh = null
  hydrated = false
}

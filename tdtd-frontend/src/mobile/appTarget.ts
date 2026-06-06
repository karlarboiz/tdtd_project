/**
 * Build/runtime target for web vs Capacitor mobile.
 * Web builds must never open device SQLite or the sync outbox.
 */

export type AppTarget = 'web' | 'mobile'

export function getAppTarget(): AppTarget {
  const raw = import.meta.env.VITE_APP_TARGET
  return raw === 'mobile' ? 'mobile' : 'web'
}

/** True when running the Capacitor shell (mobile build flavor). */
export function isMobileApp(): boolean {
  return getAppTarget() === 'mobile'
}

/** True when offline local DB + sync are allowed (mobile only). */
export function isOfflineCapable(): boolean {
  return isMobileApp()
}

/**
 * Build/runtime target for web vs Capacitor mobile.
 * Web builds must never open device SQLite or the sync outbox.
 */

import { Capacitor } from '@capacitor/core'

export type AppTarget = 'web' | 'mobile'

export function getAppTarget(): AppTarget {
  const raw = import.meta.env.VITE_APP_TARGET
  return raw === 'mobile' ? 'mobile' : 'web'
}

/** True when running the Capacitor shell (mobile build flavor). */
export function isMobileApp(): boolean {
  return getAppTarget() === 'mobile'
}

/** True when running inside a Capacitor native shell (Android/iOS). */
export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform()
}

/** True when offline local DB + sync are allowed (mobile only). */
export function isOfflineCapable(): boolean {
  return isMobileApp()
}

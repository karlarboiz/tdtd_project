import type { AttendancePeriod } from '@/types/schema'

/**
 * Mobile-only: schedule Capacitor local notifications for AM/PM attendance.
 * Web build is a no-op — server batch + in-app banners handle prompts online.
 *
 * @see .cursor/documentation/TDTD-Batch-Function.md — Phase D (mobile)
 */
export type ReminderScheduleOptions = {
  amHour: number
  amMinute: number
  pmHour: number
  pmMinute: number
  enabled: boolean
}

export const DEFAULT_REMINDER_SCHEDULE: ReminderScheduleOptions = {
  amHour: 7,
  amMinute: 0,
  pmHour: 12,
  pmMinute: 30,
  enabled: false,
}

/** True when running inside a future Capacitor shell (`VITE_APP_TARGET=mobile`). */
export function isMobileReminderCapable(): boolean {
  return import.meta.env.VITE_APP_TARGET === 'mobile'
}

/**
 * Registers repeating local notifications. Stub until Capacitor plugin is added.
 */
export async function applyAttendanceReminderSchedule(
  _options: ReminderScheduleOptions,
): Promise<void> {
  if (!isMobileReminderCapable()) return
  // Future: @capacitor/local-notifications — check local SQLite before scheduling.
}

/**
 * Cancels a period reminder after attendance is saved or server sync resolves it.
 */
export async function cancelAttendanceReminder(_period: AttendancePeriod): Promise<void> {
  if (!isMobileReminderCapable()) return
}

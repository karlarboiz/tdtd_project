import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_REMINDER_SCHEDULE,
  applyAttendanceReminderSchedule,
  cancelAttendanceReminder,
  isMobileReminderCapable,
} from './reminderSchedule'

describe('reminderSchedule', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('exposes default AM/PM schedule', () => {
    expect(DEFAULT_REMINDER_SCHEDULE).toMatchObject({
      amHour: 7,
      amMinute: 0,
      pmHour: 12,
      pmMinute: 30,
      enabled: false,
    })
  })

  it('is not mobile-capable on web build', () => {
    vi.stubEnv('VITE_APP_TARGET', '')
    expect(isMobileReminderCapable()).toBe(false)
  })

  it('is mobile-capable when VITE_APP_TARGET=mobile', () => {
    vi.stubEnv('VITE_APP_TARGET', 'mobile')
    expect(isMobileReminderCapable()).toBe(true)
  })

  it('apply and cancel are no-ops on web', async () => {
    vi.stubEnv('VITE_APP_TARGET', '')
    await expect(
      applyAttendanceReminderSchedule(DEFAULT_REMINDER_SCHEDULE),
    ).resolves.toBeUndefined()
    await expect(cancelAttendanceReminder('AM')).resolves.toBeUndefined()
  })
})

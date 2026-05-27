/** Default wall-clock zone for school-day boundaries (batch + reminders API). */
export const DEFAULT_TDTD_TIMEZONE = 'Asia/Manila'

export function getConfiguredTimezone(): string {
  const raw = process.env.TDTD_TIMEZONE?.trim()
  return raw || DEFAULT_TDTD_TIMEZONE
}

/** Calendar date YYYY-MM-DD in the given IANA timezone. */
export function getTodayYmdInTimezone(
  timeZone: string,
  now = new Date(),
): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const y = parts.find((p) => p.type === 'year')?.value
  const m = parts.find((p) => p.type === 'month')?.value
  const d = parts.find((p) => p.type === 'day')?.value
  if (!y || !m || !d) {
    throw new Error(`invalid timezone date parts for ${timeZone}`)
  }
  return `${y}-${m}-${d}`
}

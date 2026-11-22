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

/** True when the calendar day in `timeZone` is Saturday or Sunday. */
export function isWeekendInTimezone(timeZone: string, now = new Date()): boolean {
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
  }).format(now)
  return weekday === 'Sat' || weekday === 'Sun'
}

/** True when `ymd` falls on Saturday or Sunday in `timeZone`. */
export function isWeekendYmd(ymd: string, timeZone: string): boolean {
  const [y, m, d] = ymd.split('-').map(Number)
  if (!y || !m || !d) return false
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
  }).format(new Date(Date.UTC(y, m - 1, d, 12, 0, 0)))
  return weekday === 'Sat' || weekday === 'Sun'
}

/** Add calendar days to an ISO YYYY-MM-DD string. */
export function addDaysYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split('-').map(Number) as [number, number, number]
  const dt = new Date(Date.UTC(y, m - 1, d + days))
  const yy = dt.getUTCFullYear()
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(dt.getUTCDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

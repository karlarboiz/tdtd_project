import { toYMD } from './dates'

export function addDaysYmd(ymd: string, deltaDays: number): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd)
  if (!m) return ymd
  const dt = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  dt.setDate(dt.getDate() + deltaDays)
  return toYMD(dt)
}

export function lastNDaysRange(days: number): { from: string; to: string } {
  const to = toYMD(new Date())
  const from = addDaysYmd(to, -(days - 1))
  return { from, to }
}

export function calendarYearRange(year?: number): { from: string; to: string } {
  const y = year ?? new Date().getFullYear()
  return { from: `${y}-01-01`, to: `${y}-12-31` }
}

import { apiJson } from '../lib/http'

export type HolidayRangeEntry = {
  date: string
  name: string
  type: 'REGULAR' | 'SPECIAL_NON_WORKING' | 'SPECIAL_WORKING'
}

export type HolidaysRangeResponse = {
  dates: string[]
  holidays: HolidayRangeEntry[]
}

export function getHolidaysInRange(params: {
  from: string
  to: string
}): Promise<HolidaysRangeResponse> {
  const q = new URLSearchParams({
    from: params.from,
    to: params.to,
  })
  return apiJson<HolidaysRangeResponse>(`/api/holidays/range?${q.toString()}`)
}

export function getHolidayForDate(date: string): Promise<HolidaysRangeResponse> {
  return getHolidaysInRange({ from: date, to: date })
}
